// ─── VoIP Push Notification Service (iOS) ─────────────────────────────────────
// react-native-voip-push-notification registers the device for PushKit
// notifications, which wake the app immediately from background/killed state
// when a call comes in – required for iOS CallKit compliance.
// On Android, FCM data-priority notifications handle this instead.
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import VoipPushNotification from 'react-native-voip-push-notification';
import { storageService } from '{{IMPORT:storage.service}}';
import { StorageKeys } from '{{IMPORT:storage.keys}}';
import { deviceApi } from '{{IMPORT:api.device}}';
import { registerVoipToken } from '../callingEndpoints';
import type { IncomingCallData } from '../types/calling.types';

// ─── Setup ────────────────────────────────────────────────────────────────────

let voipToken: string | null = null;

export function getVoipToken(): string | null {
  return voipToken;
}

/**
 * Sends the VoIP token to the backend device and calling endpoints.
 * Caches the token in local storage to prevent redundant network calls.
 */
export async function syncVoipTokenWithBackend(token?: string): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const activeToken = token || voipToken;
    // No token yet (always on the Simulator, or without the VoIP push entitlement): wait for the
    // 'register' event from registerVoipPush. Never call registerVoipToken() here – once registered,
    // native answers it with a 'register' event carrying the (empty) last token, which calls this
    // again: an endless JS ↔ native loop that floods the UI thread and blocks every touch on iOS.
    if (!activeToken) return;
    const saved = await storageService.get<string>(StorageKeys.VOIP_TOKEN);
    if (saved === activeToken) return;

    await Promise.allSettled([
      registerVoipToken(activeToken),
      (async () => {
        const deviceId = await storageService.get<string>(StorageKeys.DEVICE_ID);
        if (deviceId) {
          await deviceApi.updateVoipToken(deviceId, activeToken);
        }
      })(),
    ]);

    await storageService.set(StorageKeys.VOIP_TOKEN, activeToken);
  } catch (error) {
    // Best effort background sync
  }
}

/**
 * Registers for VoIP push notifications (iOS only).
 * Call this once at app startup, before the user signs in.
 * The token must be sent to your backend so it can push incoming call payloads.
 */
export function registerVoipPush(
  onToken: (token: string) => void,
  onIncomingCall: (data: IncomingCallData) => void,
): void {
  if (Platform.OS !== 'ios') return;

  VoipPushNotification.addEventListener('register', (token: string) => {
    // Native re-sends its last token (empty until PushKit delivers one) – ignore empty ones.
    if (!token) return;
    voipToken = token;
    syncVoipTokenWithBackend(token);
    onToken(token);
  });

  VoipPushNotification.addEventListener('notification', (notification: any) => {
    // The notification payload from your backend should include all IncomingCallData fields.
    const data = notification as IncomingCallData;
    if (data?.callId) {
      onIncomingCall(data);
    }
    // iOS requires calling didLoadWithEvents after processing PushKit notifications.
    VoipPushNotification.onVoipNotificationCompleted(notification.uuid);
  });

  VoipPushNotification.addEventListener('didLoadWithEvents', (events: any[]) => {
    // Handle events that fired while the app was killed.
    for (const event of events) {
      if (event?.name === 'RNVoipPushRemoteNotificationsRegisteredEvent') {
        voipToken = event.data;
        if (voipToken) {
          syncVoipTokenWithBackend(voipToken);
          onToken(voipToken);
        }
      } else if (event?.name === 'RNVoipPushRemoteNotificationReceivedEvent') {
        const data = event.data as IncomingCallData;
        if (data?.callId) onIncomingCall(data);
      }
    }
  });

  VoipPushNotification.registerVoipToken();
}

export function unregisterVoipPush(): void {
  if (Platform.OS !== 'ios') return;
  VoipPushNotification.removeEventListener('register');
  VoipPushNotification.removeEventListener('notification');
  VoipPushNotification.removeEventListener('didLoadWithEvents');
}

