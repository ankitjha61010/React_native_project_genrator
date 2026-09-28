import type { PageQuery } from '{{IMPORT:core.pagination}}';
import type { Broadcast, Device, DevicePlatform, Notification } from '{{IMPORT:domain.notification}}';

export type CreateNotificationData = Pick<Notification, 'userId' | 'type' | 'title' | 'body' | 'data'> & { broadcastId?: string | null };

/** Inbox entries, push devices and broadcasts. */
export interface NotificationsRepository {
  create(data: CreateNotificationData): Promise<Notification>;
  /** Bulk insert (broadcasts). Returns the number stored. */
  createMany(data: CreateNotificationData[]): Promise<number>;
  list(userId: string, query: PageQuery): Promise<{ items: Notification[]; total: number }>;
  countUnread(userId: string): Promise<number>;
  /** False when the notification doesn't exist or belongs to someone else. */
  markRead(userId: string, id: string): Promise<boolean>;
  markAllRead(userId: string): Promise<void>;
  delete(userId: string, id: string): Promise<boolean>;
  deleteAll(userId: string): Promise<void>;

  /** Registers (or moves to this user) an FCM token. */
  saveDevice(data: { userId: string; token: string; platform: DevicePlatform }): Promise<Device>;
  removeDevice(userId: string, token: string): Promise<void>;
  listDevices(userIds: string[]): Promise<Device[]>;
  /** Tokens FCM reported as no longer valid. */
  deleteDevicesByToken(tokens: string[]): Promise<void>;

  createBroadcast(data: Omit<Broadcast, 'id' | 'createdAt'>): Promise<Broadcast>;
  listBroadcasts(query: PageQuery): Promise<{ items: Broadcast[]; total: number }>;
}
