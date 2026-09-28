/** Same types as the app's notification router (templates/common/notification). */
export const NOTIFICATION_TYPES = ['chat', 'order', 'promotion', 'account', 'general'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const DEVICE_PLATFORMS = ['ios', 'android', 'web'] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

export const BROADCAST_AUDIENCES = ['all', 'users', 'admins'] as const;
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];

/** Push payload values must be strings (FCM data messages). */
export type NotificationData = Record<string, string>;

/** An inbox entry. */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
  readAt: Date | null;
  broadcastId: string | null;
  createdAt: Date;
}

/** An FCM registration token of one app install. */
export interface Device {
  id: string;
  userId: string;
  token: string;
  platform: DevicePlatform;
  createdAt: Date;
  updatedAt: Date;
}

/** A notification an admin sent to many users. */
export interface Broadcast {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  data: NotificationData;
  audience: BroadcastAudience;
  sentById: string;
  recipientCount: number;
  createdAt: Date;
}

export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
  read: boolean;
  createdAt: string;
}

export function toNotificationView(n: Notification): NotificationView {
  return { id: n.id, type: n.type, title: n.title, body: n.body, data: n.data, read: n.readAt !== null, createdAt: n.createdAt.toISOString() };
}
