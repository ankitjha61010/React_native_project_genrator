import { z } from 'zod';
import type { ApiDocGroup } from '{{IMPORT:ex.docs.helpers}}';
import { idParams, pageQuery } from '{{IMPORT:ex.schemas}}';
import { broadcastResponseSchema, broadcastSchema, notificationSchema } from '{{IMPORT:ex.notifications.schemas}}';

/** Swagger docs of notifications.routes.ts. */
export const notificationsDocs: ApiDocGroup = {
  tag: 'Notifications',
  endpoints: [
    { method: 'get', path: '/notifications', summary: 'Your notifications, newest first (meta.unreadCount)', auth: true, query: pageQuery, response: notificationSchema, paginated: true, errors: [401, 422] },
    { method: 'get', path: '/notifications/unread-count', summary: 'Number of unread notifications (badge)', auth: true, response: z.object({ count: z.number() }), errors: [401] },
    { method: 'post', path: '/notifications/read-all', summary: 'Mark every notification as read', auth: true, errors: [401] },
    { method: 'post', path: '/notifications/broadcast', summary: 'Send a notification to all users (or one audience) – permission notifications:broadcast', status: 201, auth: true, body: broadcastSchema, response: broadcastResponseSchema, errors: [401, 403, 422] },
    { method: 'get', path: '/notifications/broadcasts', summary: 'Sent broadcasts – permission notifications:broadcast', auth: true, query: pageQuery, response: broadcastResponseSchema, paginated: true, errors: [401, 403, 422] },
    { method: 'delete', path: '/notifications/broadcasts/:id', summary: "Delete a broadcast – also from every recipient's inbox – permission notifications:broadcast", auth: true, params: idParams, errors: [401, 403, 404] },
    { method: 'delete', path: '/notifications/broadcasts', summary: 'Delete every broadcast (and their inbox entries) – permission notifications:broadcast', auth: true, response: z.object({ count: z.number() }), errors: [401, 403] },
    { method: 'patch', path: '/notifications/:id/read', summary: 'Mark one notification as read', auth: true, params: idParams, errors: [401, 404] },
    { method: 'delete', path: '/notifications/:id', summary: 'Delete one notification', auth: true, params: idParams, errors: [401, 404] },
    { method: 'delete', path: '/notifications', summary: 'Delete all your notifications', auth: true, errors: [401] },
  ],
};
