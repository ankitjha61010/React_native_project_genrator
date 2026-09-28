import { z } from 'zod';
import type { Broadcast } from '{{IMPORT:domain.notification}}';
import { emptySchema, idParams, pageQuery } from '{{IMPORT:ex.schemas}}';
import { route, WithMeta, type RouteGroup } from '{{IMPORT:ex.route}}';
import { broadcastResponseSchema, broadcastSchema, deviceTokenParams, notificationSchema, registerDeviceSchema } from '{{IMPORT:ex.notifications.schemas}}';

const broadcastView = ({ id, title, body, type, audience, recipientCount, createdAt }: Broadcast) => ({ id, title, body, type, audience, recipientCount, createdAt: createdAt.toISOString() });

/** `/notifications` – push devices, the inbox, and admin broadcasts. */
export const notificationsRoutes: RouteGroup = {
  prefix: '/notifications',
  tag: 'Notifications',
  routes: [
    route({
      method: 'post',
      path: '/devices',
      summary: 'Register this device for push (FCM token) – call after login and on token refresh',
      message: 'Device registered',
      auth: true,
      body: registerDeviceSchema,
      response: emptySchema,
      errors: [401, 422],
      handler: ({ user, body }, { notifications }) => notifications.registerDevice(user.id, body.token, body.platform),
    }),
    route({
      method: 'delete',
      path: '/devices/:token',
      summary: 'Stop push for this device (call on logout)',
      message: 'Device removed',
      auth: true,
      params: deviceTokenParams,
      response: emptySchema,
      errors: [401],
      handler: ({ user, params }, { notifications }) => notifications.unregisterDevice(user.id, params.token),
    }),
    route({
      method: 'get',
      path: '',
      summary: 'Your notifications, newest first (meta.unreadCount)',
      message: 'Notifications',
      auth: true,
      query: pageQuery,
      response: notificationSchema,
      paginated: true,
      errors: [401, 422],
      async handler({ user, query }, { notifications }) {
        const { page, unreadCount } = await notifications.list(user.id, query);
        return new WithMeta(page.items, { ...page.meta, unreadCount });
      },
    }),
    route({
      method: 'get',
      path: '/unread-count',
      summary: 'Number of unread notifications (badge)',
      message: 'Unread count',
      auth: true,
      response: z.object({ count: z.number() }),
      errors: [401],
      handler: async ({ user }, { notifications }) => ({ count: await notifications.unreadCount(user.id) }),
    }),
    route({
      method: 'post',
      path: '/read-all',
      summary: 'Mark every notification as read',
      message: 'All marked as read',
      auth: true,
      response: emptySchema,
      errors: [401],
      handler: ({ user }, { notifications }) => notifications.markAllRead(user.id),
    }),
    route({
      method: 'post',
      path: '/broadcast',
      summary: 'Send a notification to all users (or one audience) – permission notifications:broadcast',
      message: 'Broadcast sent',
      status: 201,
      permission: 'notifications:broadcast',
      body: broadcastSchema,
      response: broadcastResponseSchema,
      errors: [401, 403, 422],
      handler: async ({ user, body }, { notifications }) => broadcastView(await notifications.broadcast(user.id, body)),
    }),
    route({
      method: 'get',
      path: '/broadcasts',
      summary: 'Sent broadcasts – permission notifications:broadcast',
      message: 'Broadcasts',
      permission: 'notifications:broadcast',
      query: pageQuery,
      response: broadcastResponseSchema,
      paginated: true,
      errors: [401, 403, 422],
      handler: async ({ query }, { notifications }) => (await notifications.listBroadcasts(query)).map(broadcastView),
    }),
    route({
      method: 'patch',
      path: '/:id/read',
      summary: 'Mark one notification as read',
      message: 'Marked as read',
      auth: true,
      params: idParams,
      response: emptySchema,
      errors: [401, 404],
      handler: ({ user, params }, { notifications }) => notifications.markRead(user.id, params.id),
    }),
    route({
      method: 'delete',
      path: '/:id',
      summary: 'Delete one notification',
      message: 'Notification deleted',
      auth: true,
      params: idParams,
      response: emptySchema,
      errors: [401, 404],
      handler: ({ user, params }, { notifications }) => notifications.delete(user.id, params.id),
    }),
    route({
      method: 'delete',
      path: '',
      summary: 'Delete all your notifications',
      message: 'Notifications cleared',
      auth: true,
      response: emptySchema,
      errors: [401],
      handler: ({ user }, { notifications }) => notifications.clear(user.id),
    }),
  ],
};
