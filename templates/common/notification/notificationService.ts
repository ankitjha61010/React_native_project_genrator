import { isFirebaseConfigured } from '{{IMPORT:firebase.service}}';
import { logger } from '{{IMPORT:utils.logger}}';
import { subscribeToNotificationTaps, type NotificationTap } from './notificationHandlers';
import { requestNotificationPermission } from './notificationPermissions';
import { getFcmToken, onFcmTokenRefresh, syncFcmToken } from './notificationToken';

export interface NotificationServiceOptions {
  /** Called when the user taps a notification; `data` is the FCM data payload. */
  onNotificationTap?: (tap: NotificationTap) => void;
}

/**
 * Wires permissions, token and tap listeners together. Foreground messages are displayed
 * by the handlers registered in index.js (`registerNotificationHandlers`).
 *
 * Returns a cleanup function that removes every listener.
 */
async function initialize(options: NotificationServiceOptions = {}): Promise<() => void> {
  if (!isFirebaseConfigured()) {
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
  if (granted) {
    const token = await getFcmToken();
    if (token) {
      await syncFcmToken(token);
    }
  } else {
    logger.info('Notification permission not granted');
  }

  return () => cleanups.forEach(cleanup => cleanup());
}

export const notificationService = {
  initialize,
  requestPermission: requestNotificationPermission,
  getToken: getFcmToken,
};
