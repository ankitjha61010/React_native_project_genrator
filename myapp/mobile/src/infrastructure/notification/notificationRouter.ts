import { navigationRef } from '@presentation/navigation/navigationRef';
import { logger } from '@utils/logger';
import { notificationInbox } from './notificationInbox';
import type { NotificationTap } from './notificationDisplay';
import {
  getNotificationTarget,
  toAppNotification,
  type AppNotification,
  type NotificationTarget,
} from './notificationTypes';

function navigateTo(target: NotificationTarget): void {
  if (!navigationRef.isReady()) {
    logger.warn('Notification tap ignored: navigation is not ready');
    return;
  }
  // Every target is a screen of the signed-in stack (MainNavigator).
  navigationRef.navigate('Main', { screen: target.screen, params: target.params } as never);
}

/**
 * A tap on a PUSH notification (any app state). Routing per type lives in
 * notificationTypes.ts: `chat` opens the conversation, every other type opens the
 * Notifications screen.
 */
export function handleNotificationTap(tap: NotificationTap): void {
  const notification = { ...toAppNotification(tap), read: true };
  notificationInbox.add(notification).catch(error => logger.warn('Saving the tapped notification failed', error));
  navigateTo(getNotificationTarget(notification));
}

/**
 * A tap on a row of the Notifications screen: marks it read and opens its content –
 * the type's own target (e.g. the chat), or `data.url` in the in-app browser.
 */
export function openNotification(notification: AppNotification): void {
  notificationInbox.markRead(notification.id).catch(() => undefined);
  const target = getNotificationTarget(notification);
  if (target.screen !== 'Notifications') {
    navigateTo(target);
  } else if (notification.data.url) {
    navigateTo({ screen: 'WebView', params: { url: notification.data.url, title: notification.title } });
  }
}
