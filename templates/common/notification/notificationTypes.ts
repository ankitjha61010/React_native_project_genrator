import type { MainStackParamList } from '{{IMPORT:navigation.types}}';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  EVERY NOTIFICATION TYPE THE APP UNDERSTANDS – THE ONE PLACE TO CHANGE THEM.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The backend sends the type in the FCM **data** payload:
 *
 *   {
 *     "notification": { "title": "Jane", "body": "Hi there 👋" },
 *     "data": { "type": "chat", "conversationId": "conv_1", "senderName": "Jane" }
 *   }
 *
 * To add a type: add it to `NotificationType` and give it an entry in
 * `NOTIFICATION_TYPES` (label, icon and where a tap goes). Nothing else changes –
 * handlers, the inbox and the Notifications screen all read from here.
 */
export const NotificationType = {
  CHAT: 'chat',
  ORDER: 'order',
  PROMOTION: 'promotion',
  ACCOUNT: 'account',
  GENERAL: 'general',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/** A received notification, as stored in the inbox and shown on the Notifications screen. */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** ISO date. */
  receivedAt: string;
  read: boolean;
  /** The raw FCM data payload (all values are strings in FCM). */
  data: Record<string, string>;
}

/** Where a notification tap navigates to (a screen of the signed-in stack). */
export type NotificationTarget =
{{#if CHAT}}
  | { screen: 'ChatRoom'; params: MainStackParamList['ChatRoom'] }
{{/if}}
  | { screen: 'WebView'; params: MainStackParamList['WebView'] }
  | { screen: 'Notifications'; params?: MainStackParamList['Notifications'] };

export interface NotificationTypeConfig {
  /** Shown on the Notifications screen. */
  label: string;
  /** MaterialDesignIcons name (used when vector icons are enabled). */
  icon: string;
  /** Fallback when there is no icon font. */
  emoji: string;
  /** Tint of the icon on the Notifications screen. */
  color: string;
  /**
   * Where a tap on the PUSH notification goes. The default for every type is the
   * Notifications screen; override it per type.
   */
  target?: (notification: AppNotification) => NotificationTarget | null;
}

const notificationsScreen = (notification: AppNotification): NotificationTarget => ({
  screen: 'Notifications',
  params: { highlightId: notification.id },
});

export const NOTIFICATION_TYPES: Record<NotificationType, NotificationTypeConfig> = {
  [NotificationType.CHAT]: {
    label: 'Message',
    icon: 'chat-processing-outline',
    emoji: '💬',
    color: '#25D366',
{{#if CHAT}}
    // Chat → open the conversation directly.
    target: ({ data }) =>
      data.conversationId
        ? {
            screen: 'ChatRoom',
            params: {
              conversationId: data.conversationId,
              title: data.senderName || data.title,
              avatar: data.senderAvatar,
            },
          }
        : null,
{{/if}}
  },
  [NotificationType.ORDER]: {
    label: 'Order',
    icon: 'package-variant-closed',
    emoji: '📦',
    color: '#2563EB',
  },
  [NotificationType.PROMOTION]: {
    label: 'Offer',
    icon: 'tag-outline',
    emoji: '🏷️',
    color: '#F59E0B',
  },
  [NotificationType.ACCOUNT]: {
    label: 'Account',
    icon: 'shield-account-outline',
    emoji: '🔐',
    color: '#7C3AED',
  },
  [NotificationType.GENERAL]: {
    label: 'Notification',
    icon: 'bell-outline',
    emoji: '🔔',
    color: '#6B7280',
  },
};

function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && value in NOTIFICATION_TYPES;
}

/** FCM data values are strings; drops anything that isn't. */
function stringData(data: Record<string, unknown> | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    if (typeof value === 'string') result[key] = value;
    else if (typeof value === 'number' || typeof value === 'boolean') result[key] = String(value);
  }
  return result;
}

/** Normalises any incoming message (FCM or Notifee) into an `AppNotification`. */
export function toAppNotification(input: {
  id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}): AppNotification {
  const data = stringData(input.data);
  return {
    id: input.id ?? data.notificationId ?? `local-${Date.now()}`,
    type: isNotificationType(data.type) ? data.type : NotificationType.GENERAL,
    title: input.title ?? data.title ?? '',
    body: input.body ?? data.body ?? '',
    receivedAt: data.sentAt ?? new Date().toISOString(),
    read: false,
    data,
  };
}

export function getNotificationConfig(type: NotificationType): NotificationTypeConfig {
  return NOTIFICATION_TYPES[type] ?? NOTIFICATION_TYPES[NotificationType.GENERAL];
}

/** Target of a push tap: the type's own target, otherwise the Notifications screen. */
export function getNotificationTarget(notification: AppNotification): NotificationTarget {
  return getNotificationConfig(notification.type).target?.(notification) ?? notificationsScreen(notification);
}
