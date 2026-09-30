import { isFirebaseConfigured } from '{{IMPORT:firebase.service}}';
import { logger } from '{{IMPORT:utils.logger}}';
import { subscribeToNotificationTaps, type NotificationTap } from './notificationHandlers';
import { requestNotificationPermission } from './notificationPermissions';
import { syncFcmToken } from './deviceInfo';
import { getFcmToken, onFcmTokenRefresh } from './notificationToken';

export interface NotificationServiceOptions {
  /** Called when the user taps a notification; `data` is the FCM data payload. */
  onNotificationTap?: (tap: NotificationTap) => void;
}

/**
 * Runs whenever the signed-in part of the app opens – right after register / login / social
 * login and on every app start:
 *   1. asks for the notification permission,
 *   2. sends the FCM token only if the backend doesn't have it yet (the device itself was saved by
 *      the sign-in request – its body carries `device`, see authApi.ts),
 *   3. sends it again when FCM rotates it, and routes notification taps.
 * Foreground messages are displayed by the handlers registered in index.js.
 *
 * Returns a cleanup function that removes every listener.
 */
async function initialize(options: NotificationServiceOptions = {}): Promise<() => void> {
  if (!isFirebaseConfigured()) {
    // The device was still saved by the sign-in (without a token), so the user's device list is complete.
    logger.warn('Push notifications disabled: Firebase is not configured (see firebase/README.md).');
    return () => {};
  }

  const cleanups: Array<() => void> = [];
  if (options.onNotificationTap) {
    cleanups.push(subscribeToNotificationTaps(options.onNotificationTap));
  }
  cleanups.push(
    onFcmTokenRefresh(token => {
      syncFcmToken(token);
    }),
  );

  const granted = await requestNotificationPermission();
  if (!granted) logger.info('Notification permission not granted');
  // iOS may only have a token now that notifications are allowed – sent once if it's new.
  await syncFcmToken();

  return () => cleanups.forEach(cleanup => cleanup());
}

export const notificationService = {
  initialize,
  requestPermission: requestNotificationPermission,
  getToken: getFcmToken,
};
