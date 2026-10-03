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

/**
 * Answer / End pressed on the CallKit screen before JavaScript was listening (app killed, call answered from the
 * lock screen): CallKeep queues those and sends them once as 'didLoadWithEvents' – to whichever listener exists at
 * that moment. This listener is added the moment this module loads, before any other, so nothing is lost; the
 * events wait here until registerCallKeepListeners() hands them to the app.
 */
type NativeAction = { kind: 'answer' | 'end'; callUUID: string };
let queuedActions: NativeAction[] = [];
let actionHandlers: { onAnswerCall?: (d: { callUUID: string }) => void; onEndCall?: (d: { callUUID: string }) => void } | null = null;

function dispatchAction(action: NativeAction): void {
  if (!actionHandlers) {
    queuedActions.push(action);
    return;
  }
  if (action.kind === 'answer') actionHandlers.onAnswerCall?.({ callUUID: action.callUUID });
  else actionHandlers.onEndCall?.({ callUUID: action.callUUID });
}

if (CallKeep) {
  CallKeep.addEventListener('didLoadWithEvents', (events: Array<{ name: string; data: any }>) => {
    for (const event of events ?? []) {
      if (event.name === 'RNCallKeepDidActivateAudioSession') markAudioSessionActive();
      else if (event.name === 'RNCallKeepDidDeactivateAudioSession') audioSessionActive = false;
      else if (event.name === 'RNCallKeepDidDisplayIncomingCall' && event.data?.callUUID) knownCalls.add(String(event.data.callUUID).toLowerCase());
      else if (event.name === 'RNCallKeepPerformAnswerCallAction' && event.data?.callUUID) dispatchAction({ kind: 'answer', callUUID: event.data.callUUID });
      else if (event.name === 'RNCallKeepPerformEndCallAction' && event.data?.callUUID) dispatchAction({ kind: 'end', callUUID: event.data.callUUID });
    }
  });
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Call bookkeeping ─────────────────────────────────────────────────────────

/** CallKit calls this app reported (and hasn't ended yet) – including ones reported natively from a VoIP push. */
const knownCalls = new Set<string>();
/**
 * Calls the app itself asked CallKit to end. CallKit sends the same 'endCall' event for those as for the
 * user's End button – this tells them apart, so the app's own end never calls the API a second time.
 */
const endedByApp = new Set<string>();

function markEndedByApp(callUUID: string): void {
  endedByApp.add(callUUID.toLowerCase());
  knownCalls.delete(callUUID.toLowerCase());
}

/** True (once) when this end event comes from the app's own end request. */
export function consumeEndedByApp(callUUID: string): boolean {
  const uuid = callUUID.toLowerCase();
  knownCalls.delete(uuid);
  return endedByApp.delete(uuid);
}

// ─── Audio session (owned by CallKit) ─────────────────────────────────────────

let audioSessionActive = false;
let audioSessionWaiters: Array<() => void> = [];

function markAudioSessionActive(): void {
  audioSessionActive = true;
  const waiters = audioSessionWaiters;
  audioSessionWaiters = [];
  waiters.forEach(w => w());
}

/**
 * Resolves once CallKit has activated the audio session (after an answer) – Apple: start call audio only then.
 * Falls back after `timeoutMs` so a missing event can never block the call.
 */
export function waitForAudioSession(timeoutMs = 3000): Promise<void> {
  if (!CallKeep || audioSessionActive) return Promise.resolve();
  return new Promise(resolve => {
    const done = () => {
      clearTimeout(timer);
      audioSessionWaiters = audioSessionWaiters.filter(w => w !== done);
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    audioSessionWaiters.push(done);
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
    CallKeep.addEventListener('didActivateAudioSession', markAudioSessionActive);
    CallKeep.addEventListener('didDeactivateAudioSession', () => {
      audioSessionActive = false;
    });
    // Leftover CallKit calls from a previous run (app killed mid-call). Skipped when a call already rang
    // while setup was running – that one is real.
    if (knownCalls.size === 0) {
      try {
        CallKeep.endAllCalls();
      } catch {}
    }
    isSetup = true;
  } catch (error) {
    console.error('[CallKeep] Setup failed:', error);
  }
}

// ─── Display incoming call ────────────────────────────────────────────────────

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export function displayIncomingCall(data: IncomingCallData): string {
  // The backend's uuid first: a VoIP push may already have reported this very call natively – reporting the same
  // uuid again is a no-op for CallKit, a new one would ring a second call.
  const callUUID = data.uuid && isUuid(data.uuid) ? data.uuid.toLowerCase() : isUuid(data.callId) ? data.callId.toLowerCase() : generateUUID();
  if (!CallKeep) return callUUID;
  if (knownCalls.has(callUUID)) return callUUID;
  knownCalls.add(callUUID);
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
  markEndedByApp(callUUID);
  CallKeep.rejectCall(callUUID);
}

export function endCall(callUUID: string): void {
  if (!CallKeep) return;
  markEndedByApp(callUUID);
  CallKeep.endCall(callUUID);
}

export function endAllCalls(): void {
  if (!CallKeep) return;
  [...knownCalls].forEach(markEndedByApp);
  CallKeep.endAllCalls();
}

// ─── Call state updates ───────────────────────────────────────────────────────

export function setCurrentCallActive(callUUID: string): void {
  if (!CallKeep) return;
  CallKeep.setCurrentCallActive(callUUID);
}

export function reportEndCallWithUUID(callUUID: string, reason: 0 | 1 | 2 | 3 | 4 | 5 | 6): void {
  if (!CallKeep) return;
  // Reporting an end sends no 'endCall' event – only forget the call.
  knownCalls.delete(callUUID.toLowerCase());
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
  actionHandlers = handlers;
  // Answer / End pressed before JS was listening.
  const queued = queuedActions;
  queuedActions = [];
  queued.forEach(dispatchAction);
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
  actionHandlers = null;
  for (const sub of activeListeners) {
    sub.remove();
  }
  activeListeners = [];
}
