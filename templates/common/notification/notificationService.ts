import { isFirebaseConfigured } from '{{IMPORT:firebase.service}}';
import { logger } from '{{IMPORT:utils.logger}}';
import { subscribeToNotificationTaps, type NotificationTap } from './notificationHandlers';
import { requestNotificationPermission } from './notificationPermissions';
import { registerDevice } from './deviceInfo';
import { getFcmToken, onFcmTokenRefresh } from './notificationToken';

export interface NotificationServiceOptions {
  /** Called when the user taps a notification; `data` is the FCM data payload. */
  onNotificationTap?: (tap: NotificationTap) => void;
}

/**
 * Runs whenever the signed-in part of the app opens – right after register / login / social
 * login and on every app start:
 *   1. asks for the notification permission,
 *   2. registers this device with the backend (install id, FCM token, platform, model, versions),
 *   3. re-registers it when FCM rotates the token, and routes notification taps.
 * Foreground messages are displayed by the handlers registered in index.js.
 *
 * Returns a cleanup function that removes every listener.
 */
async function initialize(options: NotificationServiceOptions = {}): Promise<() => void> {
  if (!isFirebaseConfigured()) {
    logger.warn('Push notifications disabled: Firebase is not configured (see firebase/README.md).');
    // The device is still registered (without a token), so the user's device list is complete.
    await registerDevice();
    return () => {};
  }

  const cleanups: Array<() => void> = [];
  if (options.onNotificationTap) {
    cleanups.push(subscribeToNotificationTaps(options.onNotificationTap));
  }
  cleanups.push(
    onFcmTokenRefresh(token => {
      registerDevice(token);
    }),
  );

  const granted = await requestNotificationPermission();
  if (!granted) logger.info('Notification permission not granted');
  // With the FCM token when the permission was granted (the token is read inside).
  await registerDevice();

  return () => cleanups.forEach(cleanup => cleanup());
}

export const notificationService = {
  initialize,
  requestPermission: requestNotificationPermission,
  getToken: getFcmToken,
};
