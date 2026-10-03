// ─── Call Context & Provider ──────────────────────────────────────────────────
// Global calling provider managing:
//   • Active call lifecycle (incoming, outgoing, connected)
//   • Call minimization (floating MinimizedCallBar when app is navigated or backgrounded)
//   • Native background & lockscreen handling (CallKit on iOS, ConnectionService on Android)
//   • Socket signaling & CallKeep event bridging
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, type AppStateStatus, Modal, Platform, StyleSheet, View } from 'react-native';
import { errorMessage } from '{{IMPORT:api.errors}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { CallPermissionError, useCall } from '../hooks/useCall';
import { useCallSocket } from '../hooks/useCallSocket';
import * as CK from '../services/callKeepService';
import { nativeCallService } from '../services/nativeCallService';
import { registerVoipPush, unregisterVoipPush, syncVoipTokenWithBackend } from '../services/voipPushService';
import type { Call, ActiveCallState, IncomingCallData, CallType } from '../types/calling.types';
import { MinimizedCallBar } from '../components/MinimizedCallBar';
import { IncomingCallScreen } from '../screens/IncomingCallScreen';
import { OutgoingCallScreen } from '../screens/OutgoingCallScreen';
{{#if AUDIO_CALL}}
import { AudioCallScreen } from '../screens/AudioCallScreen';
{{/if}}
{{#if VIDEO_CALL}}
import { VideoCallScreen } from '../screens/VideoCallScreen';
{{/if}}

export interface CallContextType {
  callState: ActiveCallState;
  incomingCall: IncomingCallData | null;
  isInCall: boolean;
  isMinimized: boolean;
  callDuration: string;
  callSeconds: number;
  /** Resolves null when the call could not start (receiver busy…) – the reason is already shown. */
  startCall: (receiverId: string, callType: CallType, name?: string) => Promise<Call | null>;
  startGroupCall: (participantIds: string[], callType: CallType) => Promise<Call | null>;
  answerCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  hangUp: () => Promise<void>;
  minimizeCall: () => void;
  maximizeCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleCamera: () => void;
  flipCamera: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export function useCallContext(): CallContextType {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error('useCallContext must be used within a CallProvider');
  }
  return ctx;
}

interface CallProviderProps {
  children: React.ReactNode;
}

/** Permission refusals carry their own message; API errors are translated. */
function showCallError(error: unknown): void {
  flash.error({
    message: error instanceof CallPermissionError ? error.message : errorMessage(error),
  });
}

export function CallProvider({ children }: CallProviderProps): React.JSX.Element {
  const call = useCall();
  const [isMinimized, setIsMinimized] = useState(false);
  const [callerDisplayName, setCallerDisplayName] = useState<string>('Calling...');

  // Setup CallKeep and VoIP Push on iOS, and Native Call on Android
  useEffect(() => {
    if (Platform.OS === 'ios') {
      CK.setupCallKeep('App');
      registerVoipPush(
        (token: string) => {
          syncVoipTokenWithBackend(token);
        },
        (incomingPayload: IncomingCallData) => {
          call.handleIncomingCall(incomingPayload);
        },
      );
    } else {
      // Answer tapped on the native call screen / notification. Native keeps the answer until it is taken here,
      // so it is taken on start (app opened from killed state), on the signal, and whenever the app comes to the
      // foreground – a push may have started React before this provider mounted.
      const takePendingAnswer = () => {
        nativeCallService.getInitialCallAction().then(answer => {
          if (answer?.action !== 'answer') return;
          setCallerDisplayName(answer.callerName || 'In Call');
          call.handleIncomingCall(
            {
              callId: answer.callId,
              callerId: answer.callerId,
              callerName: answer.callerName,
              channelName: answer.channelName,
              callType: answer.callType,
              isGroupCall: false,
            },
            { answered: true },
          );
          call.answerCall(answer.callId).catch(showCallError);
        });
      };
      takePendingAnswer();
      const unsubAnswer = nativeCallService.onCallAnswered(takePendingAnswer);
      const appStateSub = AppState.addEventListener('change', next => {
        if (next === 'active') takePendingAnswer();
      });

      // Listen for Decline button tapped on Android native call activity / notification
      const unsubDecline = nativeCallService.onCallDeclined(data => {
        call.declineCall(data.callId);
      });

      // A call push while the app is open: the app's own incoming call screen, not the native notification.
      const unsubIncoming = nativeCallService.onIncomingCall(data => {
        call.handleIncomingCall(data);
        setCallerDisplayName(data.callerName || 'Incoming call');
      });

      return () => {
        unsubAnswer();
        appStateSub.remove();
        unsubDecline();
        unsubIncoming();
      };
    }

    return () => {
      if (Platform.OS === 'ios') {
        unregisterVoipPush();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bridge CallKeep events (native answer / end button) to useCall on iOS
  const callRef = useRef(call);
  callRef.current = call;

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    CK.registerCallKeepListeners({
      onAnswerCall: ({ callUUID }) => {
        callRef.current.handleCallKitAnswer(callUUID)?.catch(showCallError);
        setIsMinimized(false);
      },
      // Decides itself: the user's End (end call), Decline (reject), or an end the app asked for (ignored).
      onEndCall: ({ callUUID }) => {
        callRef.current.handleCallKitEnd(callUUID);
      },
    });

    return () => {
      CK.unregisterCallKeepListeners();
    };
  }, []);

  // Socket signaling events for incoming / ended calls. The server has already closed the call when it
  // sends an end event, so these only close it here (hangUp would call the API again).
  const closeRemotely = (callId: string) => {
    call.closeCall(callId);
    setIsMinimized(false);
  };
  useCallSocket({
    onIncomingCall: data => {
      call.handleIncomingCall(data);
      setCallerDisplayName(data.callerName || 'Incoming call');
    },
    onCallAccepted: _callId => {
      // Receiver accepted; Agora's onUserJoined marks the call connected.
    },
    onCallRejected: closeRemotely,
    onCallEnded: data => closeRemotely(data.callId),
    onCallCancelled: closeRemotely,
    onCallMissed: closeRemotely,
    onCallBusy: closeRemotely,
  });

  // Handle AppState (app put into background or brought to foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' && call.isInCall) {
        // App went to background during an active call:
        // On iOS & Android, Agora and CallKeep continue running.
        // We set minimized so that returning to the app shows the minimized bar or proper UI.
        setIsMinimized(true);
      }
    });

    return () => subscription.remove();
  }, [call.isInCall]);

  // When call status becomes disconnected or failed, reset minimization
  useEffect(() => {
    if (!call.isInCall) {
      setIsMinimized(false);
    }
  }, [call.isInCall]);

  const startCall = useCallback(
    async (receiverId: string, callType: CallType, name?: string) => {
      setCallerDisplayName(name || 'Connecting...');
      setIsMinimized(false);
      try {
        return await call.startCall(receiverId, callType);
      } catch (error) {
        showCallError(error);
        return null;
      }
    },
    [call],
  );

  const startGroupCall = useCallback(
    async (participantIds: string[], callType: CallType) => {
      setCallerDisplayName('Group Call');
      setIsMinimized(false);
      try {
        return await call.startGroupCall(participantIds, callType);
      } catch (error) {
        showCallError(error);
        return null;
      }
    },
    [call],
  );

  const answerCall = useCallback(
    async (callId: string) => {
      try {
        await call.answerCall(callId);
      } catch (error) {
        showCallError(error);
      }
      setIsMinimized(false);
    },
    [call],
  );

  const declineCall = useCallback(
    async (callId: string) => {
      await call.declineCall(callId).catch(() => undefined);
      setIsMinimized(false);
    },
    [call],
  );

  const hangUp = useCallback(async () => {
    await call.hangUp().catch(() => undefined);
    setIsMinimized(false);
  }, [call]);

  /** "Calling…" screen → Cancel: the receiver stops ringing (cancel, not end). */
  const cancelOutgoing = useCallback(async () => {
    await call.cancelOutgoing().catch(() => undefined);
    setIsMinimized(false);
  }, [call]);

  const minimizeCall = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const maximizeCall = useCallback(() => {
    setIsMinimized(false);
  }, []);

  const [callDuration, setCallDuration] = useState('00:00');
  const [callSeconds, setCallSeconds] = useState(0);

  useEffect(() => {
    if (call.callState.status === 'connected') {
      const startMs = call.callState.connectedAt ?? Date.now();
      const updateTimer = () => {
        const sec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setCallSeconds(sec);
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        setCallDuration(`${m}:${s}`);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setCallSeconds(0);
      setCallDuration('00:00');
    }
  }, [call.callState.status, call.callState.connectedAt]);

  const value = useMemo(
    () => ({
      callState: call.callState,
      incomingCall: call.incomingCall,
      isInCall: call.isInCall,
      isMinimized,
      callDuration,
      callSeconds,
      startCall,
      startGroupCall,
      answerCall,
      declineCall,
      hangUp,
      minimizeCall,
      maximizeCall,
      toggleMute: call.toggleMute,
      toggleSpeaker: call.toggleSpeaker,
      toggleCamera: call.toggleCamera,
      flipCamera: call.flipCamera,
    }),
    [
      call.callState,
      call.incomingCall,
      call.isInCall,
      isMinimized,
      callDuration,
      callSeconds,
      startCall,
      startGroupCall,
      answerCall,
      declineCall,
      hangUp,
      minimizeCall,
      maximizeCall,
      call.toggleMute,
      call.toggleSpeaker,
      call.toggleCamera,
      call.flipCamera,
    ],
  );

  // While an answer connects the call is not loaded yet – the incoming call says what type it is.
  const activeCallType = call.callState.call?.callType ?? call.incomingCall?.callType;
  // The caller sees the call screen while it rings on the other side.
  const showCallScreen =
    call.isInCall || Boolean(call.callState.call && call.callState.status === 'ringing');
  /** Your own one-to-one call that hasn't been picked up yet. */
  const calling =
    Boolean(call.callState.outgoing) &&
    (call.callState.status === 'initiating' || call.callState.status === 'ringing' || call.callState.status === 'connecting');

  return (
    <CallContext.Provider value={value}>
      {children}

      {/* Incoming call – fullscreen over the whole app (only while ringing in the app) */}
      <Modal
        visible={Boolean(call.incomingCall) && !showCallScreen}
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => undefined}
      >
        {call.incomingCall ? (
          <IncomingCallScreen
            call={call.incomingCall}
            onAnswer={() => answerCall(call.incomingCall!.callId)}
            onDecline={() => declineCall(call.incomingCall!.callId)}
          />
        ) : null}
      </Modal>

      {/* Active call – fullscreen over the whole app; back minimises it */}
      <Modal
        visible={showCallScreen && !isMinimized}
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={minimizeCall}
      >
        {/* You called: "Calling…" with Cancel until the other side picks up (Agora reports them in the channel). */}
        {calling && activeCallType ? (
          <OutgoingCallScreen callerName={callerDisplayName} callType={activeCallType} onCancel={cancelOutgoing} />
        ) : null}
        {{#if VIDEO_CALL}}
        {!calling && activeCallType === 'video' && (
          <VideoCallScreen
            state={call.callState}
            callerName={callerDisplayName}
            timer={callDuration}
            onHangUp={hangUp}
            onToggleMute={call.toggleMute}
            onToggleCamera={call.toggleCamera}
            onFlipCamera={call.flipCamera}
            onToggleSpeaker={call.toggleSpeaker}
            onMinimize={minimizeCall}
          />
        )}
        {{/if}}
        {{#if AUDIO_CALL}}
        {!calling && activeCallType === 'audio' && (
          <AudioCallScreen
            state={call.callState}
            callerName={callerDisplayName}
            timer={callDuration}
            onHangUp={hangUp}
            onToggleMute={call.toggleMute}
            onToggleSpeaker={call.toggleSpeaker}
            onMinimize={minimizeCall}
          />
        )}
        {{/if}}
      </Modal>

      {/* Floating minimised call bar over the app – drag it anywhere, tap to go back to the call */}
      {showCallScreen && isMinimized && (
        <View pointerEvents="box-none" style={styles.minimizedLayer}>
          <MinimizedCallBar
            callState={call.callState}
            callerName={callerDisplayName}
            timer={callDuration}
            onMaximize={maximizeCall}
            onHangUp={hangUp}
          />
        </View>
      )}
    </CallContext.Provider>
  );
}

const styles = StyleSheet.create({
  minimizedLayer: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000 },
});
