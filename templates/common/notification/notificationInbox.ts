import { StorageKeys } from '{{IMPORT:storage.keys}}';
import { storageService } from '{{IMPORT:storage.service}}';
import { logger } from '{{IMPORT:utils.logger}}';
import { notificationsApi } from './notificationsApi';
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

/** Keeps the server in sync without making the UI wait (the local list is updated first). */
function inBackground(request: Promise<unknown>, what: string): void {
  request.catch(error => logger.warn(`${what} failed on the server`, error));
}

/**
 * The notification inbox (Notifications screen + unread badge). The backend keeps the
 * history (GET /notifications); a local copy makes it work offline and shows pushes
 * received while the app was closed (added by notificationHandlers.ts).
 */
export const notificationInbox = {
  list: read,

  /** Loads the inbox from the backend (falls back to the local copy when offline). */
  async reload(): Promise<AppNotification[]> {
    try {
      const { items } = await notificationsApi.list(MAX_NOTIFICATIONS);
      await write(items);
      return items;
    } catch (error) {
      logger.warn('Loading notifications failed – showing the local copy', error);
      // Messages received while the app was killed are saved by another JS context.
      cache = null;
      const items = await read();
      listeners.forEach(listener => listener(items));
      return items;
    }
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
      if (!id.startsWith('local-')) inBackground(notificationsApi.markRead(id), 'Marking the notification read');
    }
  },

  async markAllRead(): Promise<void> {
    const items = await read();
    if (items.some(item => !item.read)) {
      await write(items.map(item => ({ ...item, read: true })));
      inBackground(notificationsApi.markAllRead(), 'Marking all notifications read');
    }
  },

  async remove(id: string): Promise<void> {
    await write((await read()).filter(item => item.id !== id));
    if (!id.startsWith('local-')) inBackground(notificationsApi.remove(id), 'Deleting the notification');
  },

  /** Called on sign out – clears this device's copy only (the history stays on the server). */
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
