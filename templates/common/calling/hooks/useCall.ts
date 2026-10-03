// ─── useCall hook ─────────────────────────────────────────────────────────────
// Central calling hook. Manages:
//   • Call initiation (audio / video, 1:1 / group)
//   • Incoming call display (CallKeep native UI)
//   • Agora RTC channel join/leave
//   • Mute / camera / speaker / switch-camera
//   • Minimizable to background (keeps Agora alive)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { ConnectionStateType, ErrorCodeType, RemoteVideoState, type IRtcEngineEventHandler } from 'react-native-agora';
import { logger } from '{{IMPORT:utils.logger}}';

import * as CallingApi from '../callingEndpoints';
import * as Agora from '../services/agoraService';
import * as CK from '../services/callKeepService';
import { nativeCallService } from '../services/nativeCallService';
import type { Call, ActiveCallState, IncomingCallData, CallType, CallUser } from '../types/calling.types';

/** Microphone / camera access was refused – the message says what to allow. */
export class CallPermissionError extends Error {}

/** Microphone (and camera for video) – asked before ringing anyone or answering. */
async function ensureCallPermissions(video: boolean): Promise<void> {
  if (Platform.OS !== 'android') return;
  const wanted = [
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ...(video ? [PermissionsAndroid.PERMISSIONS.CAMERA] : []),
  ];
  const result = await PermissionsAndroid.requestMultiple(wanted);
  if (wanted.some(permission => result[permission] !== PermissionsAndroid.RESULTS.GRANTED)) {
    throw new CallPermissionError(
      video
        ? 'Allow microphone and camera access to make video calls.'
        : 'Allow microphone access to make calls.',
    );
  }
}

/**
 * Agora errors after which this device can't be in the channel. Every other onError (camera, codec, audio device…)
 * is recoverable: the SDK keeps the call running, so it is only logged – ending the call on it dropped people out of
 * group calls a few seconds after a third video appeared.
 */
const FATAL_AGORA_ERRORS = new Set<number>([
  ErrorCodeType.ErrJoinChannelRejected,
  ErrorCodeType.ErrInvalidAppId,
  ErrorCodeType.ErrInvalidChannelName,
  ErrorCodeType.ErrTokenExpired,
  ErrorCodeType.ErrInvalidToken,
]);

const DEFAULT_STATE: ActiveCallState = {
  call: null,
  agoraToken: null,
  isMuted: false,
  isCameraOff: false,
  isSpeaker: false,
  remoteUids: [],
  status: 'initiating',
};

export function useCall() {
  const [state, setState] = useState<ActiveCallState>(DEFAULT_STATE);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const callUUIDRef = useRef<string | null>(null);
  /** The call being answered – native screen, notification and app can all report the same answer. */
  const answeredCallIdRef = useRef<string | null>(null);
  /** The call ringing now – the socket and the push both report it. */
  const incomingCallIdRef = useRef<string | null>(null);
  const isVideoRef = useRef(false);
  /** Latest state for native callbacks (CallKit events arrive outside React's render cycle). */
  const stateRef = useRef(state);
  stateRef.current = state;
  /**
   * iOS cold start: Answer / Decline on the CallKit screen can reach JS before the call itself (the VoIP push
   * payload). The CallKit uuid waits here until that call arrives.
   */
  const pendingCallKitActionRef = useRef<{ kind: 'answer' | 'end'; uuid: string } | null>(null);
  const answerCallRef = useRef<(callId: string, options?: { fromCallKit?: boolean }) => Promise<void>>(async () => {});
  /** A call is being started – a second tap (or a second screen) must not start another one. */
  const startingRef = useRef(false);
  /** Leaves the call properly (the server and the others are told) – for Agora failures, which arrive outside React. */
  const hangUpRef = useRef<() => Promise<void>>(async () => {});
  const declineCallRef = useRef<(callId: string) => Promise<void>>(async () => {});

  // ── Who is who (group call tiles) ─────────────────────────────────────────

  /** The call whose Agora channel we are in – its participants name the remote uids. */
  const activeCallIdRef = useRef<string | null>(null);
  const participantsRequestRef = useRef({ running: false, again: false });

  /**
   * Maps every remote Agora uid to its user (GET /calls/:callId/participants). Runs again when someone joins
   * while a request is in flight. Names are cosmetic – errors are ignored.
   */
  const loadRemoteUsers = useRef(async (): Promise<void> => {
    const request = participantsRequestRef.current;
    if (request.running) {
      request.again = true;
      return;
    }
    request.running = true;
    try {
      do {
        request.again = false;
        const callId = activeCallIdRef.current;
        if (!callId) return;
        const { participants } = await CallingApi.getCallParticipants(callId);
        const remoteUsers: Record<number, CallUser> = {};
        for (const p of participants) if (p.uid !== undefined && p.user) remoteUsers[p.uid] = p.user;
        if (activeCallIdRef.current === callId) setState(s => ({ ...s, remoteUsers }));
      } while (request.again);
    } catch {
      // Tiles fall back to "Participant".
    } finally {
      request.running = false;
    }
  }).current;

  // ── Agora event handler ───────────────────────────────────────────────────

  const eventHandler = useRef<IRtcEngineEventHandler>({
    // The other side is in the channel – only now is the call really connected.
    onUserJoined: (_conn, uid) => {
      Agora.stopRingback();
      setState(s => ({
        ...s,
        status: 'connected',
        connectedAt: s.connectedAt ?? Date.now(),
        remoteUids: [...s.remoteUids.filter(u => u !== uid), uid],
      }));
      if (!stateRef.current.remoteUsers?.[uid]) loadRemoteUsers().catch(() => undefined);
    },
    onUserOffline: (_conn, uid) => {
      setState(s => ({
        ...s,
        remoteUids: s.remoteUids.filter(u => u !== uid),
        remoteVideoOff: (s.remoteVideoOff ?? []).filter(u => u !== uid),
      }));
    },
    // Someone turned their camera off / on – their tile shows the avatar instead of a frozen picture.
    onRemoteVideoStateChanged: (_conn, uid, videoState) => {
      if (videoState === RemoteVideoState.RemoteVideoStateStopped) {
        setState(s => ({ ...s, remoteVideoOff: [...(s.remoteVideoOff ?? []).filter(u => u !== uid), uid] }));
      } else if (videoState === RemoteVideoState.RemoteVideoStateStarting || videoState === RemoteVideoState.RemoteVideoStateDecoding) {
        setState(s => ({ ...s, remoteVideoOff: (s.remoteVideoOff ?? []).filter(u => u !== uid) }));
      }
    },
    onJoinChannelSuccess: () => {
      if (callUUIDRef.current) CK.setCurrentCallActive(callUUIDRef.current);
    },
    onConnectionStateChanged: (_conn, connectionState, reason) => {
      if (connectionState === ConnectionStateType.ConnectionStateReconnecting) {
        setState(s => ({ ...s, status: 'reconnecting' }));
      } else if (connectionState === ConnectionStateType.ConnectionStateConnected) {
        // Back after a network drop.
        setState(s => (s.status === 'reconnecting' ? { ...s, status: 'connected' } : s));
      } else if (connectionState === ConnectionStateType.ConnectionStateFailed) {
        logger.warn('[agora] connection failed', reason);
        setState(s => ({ ...s, status: 'failed' }));
        hangUpRef.current().catch(() => undefined);
      }
    },
    onError: (err, msg) => {
      if (!FATAL_AGORA_ERRORS.has(err)) {
        logger.warn('[agora] error (call continues)', err, msg);
        return;
      }
      logger.warn('[agora] fatal error', err, msg);
      setState(s => ({ ...s, status: 'failed' }));
      hangUpRef.current().catch(() => undefined);
    },
  }).current;

  // ── Private helpers ───────────────────────────────────────────────────────

  const _cleanup = useCallback(async () => {
    activeCallIdRef.current = null;
    answeredCallIdRef.current = null;
    incomingCallIdRef.current = null;
    nativeCallService.setCallActive(false);
    Agora.stopRingback();
    Agora.stopRingtone();
    await Agora.leaveChannel(eventHandler);
    if (callUUIDRef.current) {
      CK.reportEndCallWithUUID(callUUIDRef.current, 1); // remoteEnded
      callUUIDRef.current = null;
    }
    if (Platform.OS === 'android') {
      await nativeCallService.endCall();
    }
    setIncomingCall(null);
    setState(DEFAULT_STATE);
  }, [eventHandler]);

  const _joinAgora = useCallback(
    async (call: Call, callId: string) => {
      const data = await CallingApi.getAgoraToken(callId);
      activeCallIdRef.current = callId;
      setState(s => ({ ...s, agoraToken: data, status: 'connecting' }));
      const engine = Agora.getEngine();
      if (!engine) {
        Agora.initAgoraEngine(data.appId);
      }
      // iOS call answered through CallKit: CallKit owns the audio session – start audio only once it is active.
      const callKitCall = Platform.OS === 'ios' && Boolean(callUUIDRef.current);
      if (callKitCall) await CK.waitForAudioSession();
      await Agora.joinChannel(data, isVideoRef.current, eventHandler, { systemManagedAudio: callKitCall });
      nativeCallService.setCallActive(true);
      setState(s => ({ ...s, call, status: 'connecting' }));
      // Names for the people already in the channel (a group call joined late).
      loadRemoteUsers().catch(() => undefined);
    },
    [eventHandler, loadRemoteUsers],
  );

  // ── Outgoing call ─────────────────────────────────────────────────────────

  const startCall = useCallback(
    async (receiverId: string, callType: CallType): Promise<Call | null> => {
      // Already starting or in a call: ignored – a double tap started two calls and left this phone in the wrong one.
      if (startingRef.current || stateRef.current.call) return null;
      startingRef.current = true;
      let call: Call | null = null;
      try {
        await ensureCallPermissions(callType === 'video');
        isVideoRef.current = callType === 'video';
        setState(s => ({ ...s, status: 'initiating', outgoing: true }));
        call = await CallingApi.initiateCall(receiverId, callType);
        setState(s => ({ ...s, call, status: 'ringing' }));
        Agora.startRingback();
        await _joinAgora(call, call.id);
        return call;
      } catch (error) {
        // Busy receiver (409), no Agora token…: close what was opened so the next tap starts clean.
        if (call) await CallingApi.cancelCall(call.id).catch(() => undefined);
        await _cleanup();
        throw error;
      } finally {
        startingRef.current = false;
      }
    },
    [_joinAgora, _cleanup],
  );

  const startGroupCall = useCallback(
    async (participantIds: string[], callType: CallType): Promise<Call | null> => {
      if (startingRef.current || stateRef.current.call) return null;
      startingRef.current = true;
      let call: Call | null = null;
      try {
        await ensureCallPermissions(callType === 'video');
        isVideoRef.current = callType === 'video';
        setState(s => ({ ...s, status: 'initiating' }));
        call = await CallingApi.initiateGroupCall(participantIds, callType);
        setState(s => ({ ...s, call, status: 'connecting' }));
        await _joinAgora(call, call.id);
        return call;
      } catch (error) {
        if (call) await CallingApi.endCall(call.id).catch(() => undefined);
        await _cleanup();
        throw error;
      } finally {
        startingRef.current = false;
      }
    },
    [_joinAgora, _cleanup],
  );

  // ── Incoming call (from CallKeep / VoIP push / socket) ────────────────────

  /** `answered`: already answered on the native Android call screen – no ringing, no second native screen. */
  const handleIncomingCall = useCallback(
    (data: IncomingCallData, options?: { answered?: boolean }) => {
      if (answeredCallIdRef.current === data.callId) return;
      if (incomingCallIdRef.current === data.callId && !options?.answered) return;
      incomingCallIdRef.current = data.callId;
      setIncomingCall(data);
      isVideoRef.current = data.callType === 'video';
      if (options?.answered) return;
      if (Platform.OS === 'ios') {
        // On iOS, CallKit (CXProvider) handles the incoming ringtone natively.
        // Calling InCallManager/Agora ringtone here conflicts with the CallKit audio session,
        // which causes iOS to immediately reject/abort the incoming call.
        const uuid = CK.displayIncomingCall(data);
        callUUIDRef.current = uuid;
        // Already answered / declined on the CallKit screen while JS was starting.
        const pending = pendingCallKitActionRef.current;
        if (pending && pending.uuid === uuid.toLowerCase()) {
          pendingCallKitActionRef.current = null;
          if (pending.kind === 'answer') {
            setState(s => ({ ...s, status: 'ringing' }));
            answerCallRef.current(data.callId, { fromCallKit: true }).catch(() => undefined);
          } else {
            callUUIDRef.current = null;
            declineCallRef.current(data.callId).catch(() => undefined);
          }
          return;
        }
      } else {
        // Native decides (it knows whether the app is really on screen): in the background the notification rings
        // (full screen on the lock screen, a pop-up otherwise); on screen only the app's own call screen rings.
        nativeCallService.showIncomingCall(data).then(shownNatively => {
          if (!shownNatively && incomingCallIdRef.current === data.callId) Agora.startRingtone();
        });
      }
      setState(s => ({ ...s, status: 'ringing' }));
    },
    [],
  );

  /** `fromCallKit`: answered on the iOS CallKit screen – CallKit already knows, don't answer it again. */
  const answerCall = useCallback(
    async (callId: string, options?: { fromCallKit?: boolean }) => {
      if (answeredCallIdRef.current === callId) return;
      answeredCallIdRef.current = callId;
      // The call screen shows right away ("Connecting…") while the call is accepted and joined.
      setState(s => ({ ...s, status: 'connecting' }));
      if (Platform.OS === 'ios') {
        // Answered in the app: tell CallKit, which then activates the audio session for the call.
        if (callUUIDRef.current && !options?.fromCallKit) CK.answerIncomingCall(callUUIDRef.current);
      } else {
        Agora.stopRingtone();
        await nativeCallService.endCall();
      }
      try {
        await ensureCallPermissions(isVideoRef.current);
        const call = await CallingApi.acceptCall(callId);
        setState(s => ({ ...s, call, status: 'connecting' }));
        await _joinAgora(call, callId);
      } catch (error) {
        // The caller already hung up, or the call timed out.
        await _cleanup();
        throw error;
      }
    },
    [_joinAgora, _cleanup],
  );

  const declineCall = useCallback(async (callId: string) => {
    if (Platform.OS === 'ios') {
      if (callUUIDRef.current) {
        CK.rejectIncomingCall(callUUIDRef.current);
        callUUIDRef.current = null;
      }
    } else {
      Agora.stopRingtone();
      await nativeCallService.endCall();
    }
    incomingCallIdRef.current = null;
    setIncomingCall(null);
    setState(DEFAULT_STATE);
    await CallingApi.rejectCall(callId);
  }, []);

  // ── End / Cancel ──────────────────────────────────────────────────────────

  const hangUp = useCallback(async () => {
    // Hanging up while an answer is still connecting ends that call too.
    const callId = stateRef.current.call?.id ?? answeredCallIdRef.current;
    if (!callId) return;
    if (Platform.OS === 'android') {
      await nativeCallService.endCall();
    }
    try {
      await CallingApi.endCall(callId);
    } finally {
      await _cleanup();
    }
  }, [_cleanup]);

  const cancelOutgoing = useCallback(async () => {
    const callId = state.call?.id;
    if (!callId) return;
    Agora.stopRingback();
    try {
      await CallingApi.cancelCall(callId);
    } finally {
      await _cleanup();
    }
  }, [state.call, _cleanup]);

  /**
   * The other side ended it (socket call:ended / rejected / cancelled / missed): close the call here only –
   * the server already has it closed, so no API call.
   */
  const closeCall = useCallback(
    async (callId: string) => {
      const current = state.call?.id ?? incomingCall?.callId;
      if (current && current !== callId) return;
      await _cleanup();
    },
    [state.call, incomingCall, _cleanup],
  );

  // ── iOS CallKit buttons ───────────────────────────────────────────────────

  /** Answer on the CallKit screen. */
  const handleCallKitAnswer = useCallback(
    (callUUID: string) => {
      if (!callUUIDRef.current) {
        // The call itself hasn't reached JS yet – answer it as soon as it does.
        pendingCallKitActionRef.current = { kind: 'answer', uuid: callUUID.toLowerCase() };
        return;
      }
      if (callUUID.toLowerCase() !== callUUIDRef.current.toLowerCase()) return;
      const callId = incomingCallIdRef.current;
      if (callId) return answerCall(callId, { fromCallKit: true });
    },
    [answerCall],
  );

  /**
   * CallKit ended a call. Only the user's own End / Decline on the CallKit screen reaches the API:
   * ends the app asked for itself, and calls that aren't the current one (left over from an earlier run),
   * are ignored. Answered → end the call; still ringing → decline it.
   */
  const handleCallKitEnd = useCallback(
    async (callUUID: string) => {
      if (CK.consumeEndedByApp(callUUID)) return;
      if (!callUUIDRef.current && !answeredCallIdRef.current && !incomingCallIdRef.current) {
        // Declined before the call reached JS – decline it as soon as it does.
        pendingCallKitActionRef.current = { kind: 'end', uuid: callUUID.toLowerCase() };
        return;
      }
      if (!callUUIDRef.current || callUUID.toLowerCase() !== callUUIDRef.current.toLowerCase()) return;
      // CallKit has already closed its screen – nothing to report back.
      callUUIDRef.current = null;
      const answeredId = answeredCallIdRef.current ?? stateRef.current.call?.id;
      if (answeredId) {
        await hangUp().catch(() => undefined);
        return;
      }
      const ringingId = incomingCallIdRef.current;
      if (ringingId) await declineCall(ringingId).catch(() => undefined);
    },
    [hangUp, declineCall],
  );

  answerCallRef.current = answerCall;
  declineCallRef.current = declineCall;
  hangUpRef.current = hangUp;

  // ── Audio / Video controls ────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    setState(s => {
      Agora.muteLocalAudio(!s.isMuted);
      return { ...s, isMuted: !s.isMuted };
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setState(s => {
      Agora.setSpeaker(!s.isSpeaker);
      return { ...s, isSpeaker: !s.isSpeaker };
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setState(s => {
      Agora.muteLocalVideo(!s.isCameraOff);
      return { ...s, isCameraOff: !s.isCameraOff };
    });
  }, []);

  const flipCamera = useCallback(() => {
    Agora.switchCamera();
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      Agora.destroyAgoraEngine();
      CK.endAllCalls();
    };
  }, []);

  return {
    // State
    callState: state,
    incomingCall,
    isInCall:
      state.status === 'connected' ||
      state.status === 'connecting' ||
      state.status === 'reconnecting',
    // Actions
    startCall,
    startGroupCall,
    handleIncomingCall,
    answerCall,
    declineCall,
    hangUp,
    cancelOutgoing,
    closeCall,
    handleCallKitAnswer,
    handleCallKitEnd,
    // Controls
    toggleMute,
    toggleSpeaker,
    toggleCamera,
    flipCamera,
  };
}
