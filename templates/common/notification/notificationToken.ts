import { getMessaging, getToken, onTokenRefresh } from '@react-native-firebase/messaging';
import { isFirebaseConfigured } from '{{IMPORT:firebase.service}}';
import { logger } from '{{IMPORT:utils.logger}}';

/** The FCM registration token of this device, or null if unavailable. */
export async function getFcmToken(): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }
  try {
    return await getToken(getMessaging());
  } catch (error) {
    // iOS simulators without APNs and devices without Play Services end up here.
    logger.warn('Unable to get FCM token', error);
    return null;
  }
}

export function onFcmTokenRefresh(listener: (token: string) => void): () => void {
  if (!isFirebaseConfigured()) {
    return () => {};
  }
  return onTokenRefresh(getMessaging(), listener);
}

/**
 * TODO: send the token to your backend so it can target this device.
 * Keep it idempotent – it runs on every app start and on every token refresh.
 */
export async function syncFcmToken(token: string): Promise<void> {
  logger.info('FCM token', token);
}
