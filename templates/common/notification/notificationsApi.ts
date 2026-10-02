import { api } from '{{IMPORT:api.client}}';
import { NotificationType, type AppNotification } from './notificationTypes';

/** The backend's notification (see its docs/API.md). */
interface ServerNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
}

const TYPES = new Set<string>(Object.values(NotificationType));

const toAppNotification = (n: ServerNotification): AppNotification => ({
  id: n.id,
  type: (TYPES.has(n.type) ? n.type : NotificationType.GENERAL) as AppNotification['type'],
  title: n.title,
  body: n.body,
  receivedAt: n.createdAt,
  read: n.read,
  data: n.data,
});

/** The server-side notification inbox (devices: api/deviceApi.ts). */
export const notificationsApi = {
  /** Newest first (the backend returns at most 100 per page). */
  async list(limit = 100): Promise<{ items: AppNotification[]; unreadCount: number }> {
    const page = await api.page<ServerNotification>('/notifications', { params: { page: 1, limit } });
    return { items: page.items.map(toAppNotification), unreadCount: Number(page.meta.unreadCount ?? 0) };
  },

  markRead: (id: string) => api.patch<null>(`/notifications/${encodeURIComponent(id)}/read`),
  markAllRead: () => api.post<null>('/notifications/read-all'),
  remove: (id: string) => api.delete<null>(`/notifications/${encodeURIComponent(id)}`),
  /** Deletes every notification of the signed-in user. */
  removeAll: () => api.delete<null>('/notifications'),
};
