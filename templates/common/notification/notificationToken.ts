import { getMessaging, getToken, onTokenRefresh } from '@react-native-firebase/messaging';
import { isFirebaseConfigured } from '{{IMPORT:firebase.service}}';
import { logger } from '{{IMPORT:utils.logger}}';
import { notificationsApi } from './notificationsApi';

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
 * Registers the token with the backend (POST /notifications/devices) so it can push to this
 * device. Idempotent – it runs on every app start and on every token refresh.
 */
export async function syncFcmToken(token: string): Promise<void> {
  try {
    await notificationsApi.registerDevice(token);
    logger.debug('FCM token registered');
  } catch (error) {
    logger.warn('Registering the FCM token failed', error);
  }
}
