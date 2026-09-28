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
import { notificationInbox } from './notificationInbox';
import { toAppNotification } from './notificationTypes';
import {
  displayNotification,
  handleBackgroundNotificationEvent,
  takePendingNotificationTap,
  type NotificationTap,
} from './notificationDisplay';

export type { NotificationTap, RemoteMessage };

/** Stores a received message in the inbox (Notifications screen + unread badge). */
async function saveToInbox(message: RemoteMessage): Promise<void> {
  const notification = toAppNotification({
    id: message.messageId,
    title: message.notification?.title,
    body: message.notification?.body,
    data: message.data,
  });
  if (!notification.title && !notification.body) return; // silent data message
  try {
    await notificationInbox.add(notification);
  } catch (error) {
    logger.warn('Saving the notification failed', error);
  }
}

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
    await saveToInbox(message);
    if (!message.notification) {
      await displayNotification(message);
    }
  });

  onMessage(messaging, async message => {
    logger.info('Foreground message', message.messageId);
    await saveToInbox(message);
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
        const { id, title, body, data } = detail.notification;
        emit({ id, title, body, data: data ?? {} });
      }
    }),
  );
  notifee
    .getInitialNotification()
    .then(initial => {
      if (initial) {
        const { id, title, body, data } = initial.notification;
        emit({ id, title, body, data: data ?? {} });
      }
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
    const fromMessage = (message: RemoteMessage): NotificationTap => ({
      id: message.messageId,
      title: message.notification?.title,
      body: message.notification?.body,
      data: message.data ?? {},
    });
    cleanups.push(onNotificationOpenedApp(messaging, message => emit(fromMessage(message))));
    getInitialNotification(messaging)
      .then(message => {
        if (message) emit(fromMessage(message));
      })
      .catch(error => logger.warn('getInitialNotification failed', error));
  }

  return () => cleanups.forEach(cleanup => cleanup());
}
