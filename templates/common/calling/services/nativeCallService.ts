// ─── Native Call Service (Android Native Popup & Intent Bridge) ──────────────
// Interacts with Android's NativeCallModule for:
//   • Waking device and displaying full-screen native incoming call UI in killed mode
//   • Playing native ringtone and vibrating even if JS runtime is suspended
//   • Detecting user actions (Accept / Decline) from native activity or notification
//   • Passing call parameters (callId, callerName, token, channel) into React Native
// ─────────────────────────────────────────────────────────────────────────────

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type { CallType, IncomingCallData } from '../types/calling.types';

export interface NativeCallAnswerPayload {
  action: 'answer';
  callId: string;
  callerId: string;
  callerName: string;
  channelName: string;
  callType: CallType;
  token?: string;
}

export interface NativeCallDeclinePayload {
  callId: string;
}

const { NativeCallModule } = NativeModules;
const eventEmitter = NativeCallModule ? new NativeEventEmitter(NativeCallModule) : null;

export const nativeCallService = {
  isAvailable(): boolean {
    return Platform.OS === 'android' && !!NativeCallModule;
  },

  /**
   * Retrieves pending call answer details if the app was launched by tapping
   * "Answer" on the native call screen while in killed/background mode.
   */
  async getInitialCallAction(): Promise<NativeCallAnswerPayload | null> {
    if (Platform.OS !== 'android' || !NativeCallModule) return null;
    try {
      return await NativeCallModule.getInitialCallAction();
    } catch {
      return null;
    }
  },

  /**
   * Displays the native Android incoming call UI with ringtone and vibration.
   */
  /** Resolves false when nothing was shown natively (the app is on screen – it shows its own call screen). */
  async showIncomingCall(callData: IncomingCallData): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeCallModule) return false;
    try {
      return Boolean(await NativeCallModule.showIncomingCall(callData));
    } catch (e) {
      console.warn('[NativeCallService] Failed to show incoming call:', e);
      return false;
    }
  },

  /**
   * Dismisses the native incoming call notification and stops ringing.
   */
  async endCall(): Promise<void> {
    if (Platform.OS !== 'android' || !NativeCallModule) return;
    try {
      await NativeCallModule.endCall();
    } catch (e) {
      console.warn('[NativeCallService] Failed to end call:', e);
    }
  },

  /**
   * Listens for call answer events while the app is active in background or foreground.
   */
  onCallAnswered(callback: (event: NativeCallAnswerPayload) => void): () => void {
    if (!eventEmitter) return () => {};
    const subscription = eventEmitter.addListener('onCallAnswered', (event: unknown) => {
      callback(event as NativeCallAnswerPayload);
    });
    return () => subscription.remove();
  },

  /**
   * A call push that arrived while the app is in the foreground: the app shows its own call screen
   * instead of the native notification.
   */
  onIncomingCall(callback: (event: IncomingCallData) => void): () => void {
    if (!eventEmitter) return () => {};
    const subscription = eventEmitter.addListener('onIncomingCall', (event: unknown) => {
      const data = event as Omit<IncomingCallData, 'isGroupCall'> & { isGroupCall?: string | boolean };
      callback({ ...data, isGroupCall: data.isGroupCall === true || data.isGroupCall === 'true' });
    });
    return () => subscription.remove();
  },

  /** During a call the app shows over the lock screen and keeps the screen on (like the phone app). */
  async setCallActive(active: boolean): Promise<void> {
    if (Platform.OS !== 'android' || !NativeCallModule) return;
    try {
      await NativeCallModule.setCallActive(active);
    } catch (e) {
      console.warn('[NativeCallService] Failed to update lock screen mode:', e);
    }
  },

  /**
   * Listens for call decline events from native notification or activity.
   */
  onCallDeclined(callback: (event: NativeCallDeclinePayload) => void): () => void {
    if (!eventEmitter) return () => {};
    const subscription = eventEmitter.addListener('onCallDeclined', (event: unknown) => {
      callback(event as NativeCallDeclinePayload);
    });
    return () => subscription.remove();
  },
};
