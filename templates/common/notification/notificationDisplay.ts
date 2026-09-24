import notifee, { AndroidImportance, EventType, type Event } from '@notifee/react-native';
import type { RemoteMessage } from '@react-native-firebase/messaging';
import { StorageKeys } from '{{IMPORT:storage.keys}}';
import { storageService } from '{{IMPORT:storage.service}}';
import { logger } from '{{IMPORT:utils.logger}}';

/** A pressed notification – FCM (shown by the OS) or Notifee (shown by us). */
export interface NotificationTap {
  id?: string;
  data: Record<string, unknown>;
}

/** Android notification channel used for every displayed notification. */
export const DEFAULT_CHANNEL_ID = 'default';

let channel: Promise<string> | undefined;

/** Creates the Android channel once (a no-op on iOS). */
function ensureChannel(): Promise<string> {
  channel ??= notifee.createChannel({
    id: DEFAULT_CHANNEL_ID,
    name: 'General',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
  return channel;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Shows an FCM message as a local notification with Notifee.
 *
 * Used for messages the OS does NOT display on its own:
 *  - every message received while the app is in the foreground (`onMessage`),
 *  - data-only messages received in the background (`setBackgroundMessageHandler`).
 *
 * Title/body come from `notification`, or from `data.title` / `data.body` for data-only messages.
 */
export async function displayNotification(message: RemoteMessage): Promise<void> {
  const title = message.notification?.title ?? text(message.data?.title);
  const body = message.notification?.body ?? text(message.data?.body);
  if (!title && !body) {
    return; // silent data message – nothing to show
  }
  try {
    const channelId = await ensureChannel();
    await notifee.displayNotification({
      id: message.messageId,
      title,
      body,
      data: message.data ?? {},
      android: {
        channelId,
        // Opens the app when the notification is pressed.
        pressAction: { id: 'default' },
        // Uses the launcher icon. For a proper status bar icon add a white, transparent
        // `ic_notification` drawable and set `smallIcon: 'ic_notification'`.
        smallIcon: 'ic_launcher',
      },
      ios: {
        foregroundPresentationOptions: { banner: true, list: true, sound: true, badge: true },
      },
    });
  } catch (error) {
    logger.error('displayNotification failed', error);
  }
}

/**
 * Notifee events while the app is in the background or killed (registered in index.js).
 * A press is stored and replayed once the app is open (see `subscribeToNotificationTaps`).
 */
export async function handleBackgroundNotificationEvent({ type, detail }: Event): Promise<void> {
  if ((type === EventType.PRESS || type === EventType.ACTION_PRESS) && detail.notification) {
    const tap: NotificationTap = { id: detail.notification.id, data: detail.notification.data ?? {} };
    await storageService.set(StorageKeys.PENDING_NOTIFICATION_TAP, tap);
  }
}

/** The press stored by `handleBackgroundNotificationEvent`, removed once read. */
export async function takePendingNotificationTap(): Promise<NotificationTap | null> {
  const tap = await storageService.get<NotificationTap>(StorageKeys.PENDING_NOTIFICATION_TAP);
  if (tap) {
    await storageService.remove(StorageKeys.PENDING_NOTIFICATION_TAP);
  }
  return tap;
}
