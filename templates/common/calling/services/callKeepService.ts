// ─── CallKeep Service ─────────────────────────────────────────────────────────
// iOS: Uses CallKit (PushKit VoIP push → incoming call UI, native call screen).
// Android: Uses native IncomingCallActivity + CallNotificationService instead.
// The app remains functional in background/killed state because CallKeep handles
// the native UI on iOS and wakes the JS engine when the user answers / rejects.
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import type { CallType, IncomingCallData } from '../types/calling.types';

// react-native-callkeep is used for iOS CallKit.
// On Android, native IncomingCallActivity + CallNotificationService is used instead.
// Importing react-native-callkeep on Android throws in React Native New Architecture (TurboModuleInterop)
// due to overloaded displayIncomingCall methods in RNCallKeepModule.
const CallKeep: any = Platform.OS === 'ios' ? require('react-native-callkeep').default : null;

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let isSetup = false;

export async function setupCallKeep(appName: string): Promise<void> {
  if (isSetup || !CallKeep) return;
  try {
    await CallKeep.setup({
      ios: {
        appName,
        supportsVideo: true,
        maximumCallGroups: '2',
        maximumCallsPerCallGroup: '2',
        ringtoneSound: 'default',
        includesCallsInRecents: true,
      },
    });
    try {
      CallKeep.endAllCalls();
    } catch {}
    isSetup = true;
  } catch (error) {
    console.error('[CallKeep] Setup failed:', error);
  }
}

// ─── Display incoming call ────────────────────────────────────────────────────

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export function displayIncomingCall(data: IncomingCallData): string {
  const callUUID = isUuid(data.callId) ? data.callId.toLowerCase() : generateUUID();
  if (!CallKeep) return callUUID;
  try {
    CallKeep.displayIncomingCall(
      callUUID,
      data.callerId,
      data.callerName,
      'generic',
      data.callType === 'video',
    );
  } catch (err) {
    console.warn('[CallKeep] displayIncomingCall error:', err);
  }
  return callUUID;
}

// ─── Answer / reject ─────────────────────────────────────────────────────────

export function answerIncomingCall(callUUID: string): void {
  if (!CallKeep) return;
  CallKeep.answerIncomingCall(callUUID);
}

export function rejectIncomingCall(callUUID: string): void {
  if (!CallKeep) return;
  CallKeep.rejectCall(callUUID);
}

export function endCall(callUUID: string): void {
  if (!CallKeep) return;
  CallKeep.endCall(callUUID);
}

export function endAllCalls(): void {
  if (!CallKeep) return;
  CallKeep.endAllCalls();
}

// ─── Call state updates ───────────────────────────────────────────────────────

export function setCurrentCallActive(callUUID: string): void {
  if (!CallKeep) return;
  CallKeep.setCurrentCallActive(callUUID);
}

export function reportEndCallWithUUID(callUUID: string, reason: 0 | 1 | 2 | 3 | 4 | 5 | 6): void {
  if (!CallKeep) return;
  // Reasons: 0=failed, 1=remoteEnded, 2=unanswered, 3=answeredElsewhere, 4=declinedElsewhere, 5=missedOnOtherDevice, 6=rejectedElsewhere
  CallKeep.reportEndCallWithUUID(callUUID, reason);
}

export function updateDisplay(callUUID: string, displayName: string): void {
  if (!CallKeep) return;
  CallKeep.updateDisplay(callUUID, displayName, 'generic');
}

// ─── Event listeners (call from outside JS → JS) ────────────────────────────

export function onAnswerCall(callback: (callUUID: string) => void): () => void {
  if (!CallKeep) return () => {};
  const listener = CallKeep.addEventListener('answerCall', ({ callUUID }: { callUUID: string }) => callback(callUUID));
  return () => listener.remove();
}

export function onEndCall(callback: (callUUID: string) => void): () => void {
  if (!CallKeep) return () => {};
  const listener = CallKeep.addEventListener('endCall', ({ callUUID }: { callUUID: string }) => callback(callUUID));
  return () => listener.remove();
}

export function onToggleMute(callback: (muted: boolean, callUUID: string) => void): () => void {
  if (!CallKeep) return () => {};
  const listener = CallKeep.addEventListener('didPerformSetMutedCallAction', ({ muted, callUUID }: { muted: boolean; callUUID: string }) => callback(muted, callUUID));
  return () => listener.remove();
}

export function onToggleHold(callback: (hold: boolean, callUUID: string) => void): () => void {
  if (!CallKeep) return () => {};
  const listener = CallKeep.addEventListener('didToggleHoldCallAction', ({ hold, callUUID }: { hold: boolean; callUUID: string }) => callback(hold, callUUID));
  return () => listener.remove();
}

export function onAudioSessionActivated(callback: () => void): () => void {
  if (!CallKeep) return () => {};
  const listener = CallKeep.addEventListener('didActivateAudioSession', callback);
  return () => listener.remove();
}

let activeListeners: Array<{ remove: () => void }> = [];

export function registerCallKeepListeners(handlers: {
  onAnswerCall?: (data: { callUUID: string }) => void;
  onEndCall?: (data: { callUUID: string }) => void;
}): void {
  unregisterCallKeepListeners();
  if (Platform.OS !== 'ios' || !CallKeep) return;
  if (handlers.onAnswerCall) {
    const sub = CallKeep.addEventListener('answerCall', handlers.onAnswerCall);
    activeListeners.push(sub);
  }
  if (handlers.onEndCall) {
    const sub = CallKeep.addEventListener('endCall', handlers.onEndCall);
    activeListeners.push(sub);
  }
}

export function unregisterCallKeepListeners(): void {
  for (const sub of activeListeners) {
    sub.remove();
  }
  activeListeners = [];
}
