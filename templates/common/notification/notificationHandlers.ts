import notifee, { EventType } from '@notifee/react-native';
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  setBackgroundMessageHandler,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { isFirebaseConfigured } from '{{IMPORT:firebase.service}}';
import { logger } from '{{IMPORT:utils.logger}}';
import {
  displayNotification,
  handleBackgroundNotificationEvent,
  takePendingNotificationTap,
  type NotificationTap,
} from './notificationDisplay';

export type { NotificationTap, RemoteMessage };

/**
 * Everything that must be registered outside React, as early as possible – called from
 * index.js (the app entry point):
 *
 *  - `onMessage`: messages received while the app is open. The OS does NOT show these,
 *    so they are displayed with `notifee.displayNotification`.
 *  - `setBackgroundMessageHandler`: messages received in the background / quit state.
 *    Notification messages are shown by the OS; data-only messages are displayed here.
 *  - `notifee.onBackgroundEvent`: presses on our notifications while in the background.
 */
export function registerNotificationHandlers(): void {
  notifee.onBackgroundEvent(handleBackgroundNotificationEvent);

  if (!isFirebaseConfigured()) {
    return;
  }
  const messaging = getMessaging();

  setBackgroundMessageHandler(messaging, async message => {
    logger.info('Background message', message.messageId);
    if (!message.notification) {
      await displayNotification(message);
    }
  });

  onMessage(messaging, async message => {
    logger.info('Foreground message', message.messageId);
    await displayNotification(message);
  });
}

/**
 * Notification presses, however the notification was shown and whatever state the app
 * was in: FCM (background / cold start) and Notifee (foreground, background, cold start).
 */
export function subscribeToNotificationTaps(listener: (tap: NotificationTap) => void): () => void {
  const handled = new Set<string>();
  const emit = (tap: NotificationTap) => {
    if (tap.id) {
      if (handled.has(tap.id)) return; // the same press can be reported by two sources
      handled.add(tap.id);
    }
    listener(tap);
  };
  const cleanups: Array<() => void> = [];

  // Notifications displayed with Notifee.
  cleanups.push(
    notifee.onForegroundEvent(({ type, detail }) => {
      if ((type === EventType.PRESS || type === EventType.ACTION_PRESS) && detail.notification) {
        emit({ id: detail.notification.id, data: detail.notification.data ?? {} });
      }
    }),
  );
  notifee
    .getInitialNotification()
    .then(initial => {
      if (initial) emit({ id: initial.notification.id, data: initial.notification.data ?? {} });
    })
    .catch(error => logger.warn('notifee.getInitialNotification failed', error));
  takePendingNotificationTap()
    .then(tap => {
      if (tap) emit(tap);
    })
    .catch(error => logger.warn('Reading the pending notification tap failed', error));

  // Notifications displayed by the OS (FCM notification messages in the background).
  if (isFirebaseConfigured()) {
    const messaging = getMessaging();
    cleanups.push(onNotificationOpenedApp(messaging, message => emit({ id: message.messageId, data: message.data ?? {} })));
    getInitialNotification(messaging)
      .then(message => {
        if (message) emit({ id: message.messageId, data: message.data ?? {} });
      })
      .catch(error => logger.warn('getInitialNotification failed', error));
  }

  return () => cleanups.forEach(cleanup => cleanup());
}
