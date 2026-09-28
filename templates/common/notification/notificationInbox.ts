import { StorageKeys } from '{{IMPORT:storage.keys}}';
import { storageService } from '{{IMPORT:storage.service}}';
import { logger } from '{{IMPORT:utils.logger}}';
import type { AppNotification } from './notificationTypes';

/** Newest first; older notifications are dropped. */
const MAX_NOTIFICATIONS = 100;

type Listener = (notifications: AppNotification[]) => void;

let cache: AppNotification[] | null = null;
const listeners = new Set<Listener>();

async function read(): Promise<AppNotification[]> {
  cache ??= (await storageService.get<AppNotification[]>(StorageKeys.NOTIFICATION_INBOX)) ?? [];
  return cache;
}

async function write(next: AppNotification[]): Promise<void> {
  cache = next;
  listeners.forEach(listener => listener(next));
  try {
    await storageService.set(StorageKeys.NOTIFICATION_INBOX, next);
  } catch (error) {
    logger.warn('Saving the notification inbox failed', error);
  }
}

/**
 * Local list of received notifications (backs the Notifications screen and the
 * unread badge). Messages are added by the FCM handlers – see notificationHandlers.ts.
 *
 * Replace `reload()` with an API call if your backend keeps the notification history.
 */
export const notificationInbox = {
  list: read,

  /** Re-reads storage – messages received while the app was killed are saved by another JS context. */
  async reload(): Promise<AppNotification[]> {
    cache = null;
    const items = await read();
    listeners.forEach(listener => listener(items));
    return items;
  },

  /** Adds (or updates) a notification; the same id is never stored twice. */
  async add(notification: AppNotification): Promise<void> {
    const items = await read();
    const existing = items.find(item => item.id === notification.id);
    if (existing) {
      if (notification.read && !existing.read) {
        await write(items.map(item => (item.id === notification.id ? { ...item, read: true } : item)));
      }
      return;
    }
    await write([notification, ...items].slice(0, MAX_NOTIFICATIONS));
  },

  async markRead(id: string): Promise<void> {
    const items = await read();
    if (items.some(item => item.id === id && !item.read)) {
      await write(items.map(item => (item.id === id ? { ...item, read: true } : item)));
    }
  },

  async markAllRead(): Promise<void> {
    const items = await read();
    if (items.some(item => !item.read)) {
      await write(items.map(item => ({ ...item, read: true })));
    }
  },

  async remove(id: string): Promise<void> {
    await write((await read()).filter(item => item.id !== id));
  },

  /** Called on sign out. */
  async clear(): Promise<void> {
    await write([]);
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
