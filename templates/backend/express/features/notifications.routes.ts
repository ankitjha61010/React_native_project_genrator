import { Router } from 'express';
import type { Services } from '{{IMPORT:app.container}}';
import { requireAuth, requirePermission } from '{{IMPORT:ex.mw.auth}}';
import { NotificationsController } from '{{IMPORT:ex.notifications.controller}}';

/** `/notifications` – the inbox and admin broadcasts. */
export function notificationsRoutes(services: Services): Router {
  const router = Router();
  const notifications = new NotificationsController(services.notifications);

  // Every /notifications route needs a signed-in user.
  router.use(requireAuth(services.sessions));

  router.get('/', notifications.list);
  router.get('/unread-count', notifications.unreadCount);
  router.post('/read-all', notifications.markAllRead);
  router.post('/broadcast', requirePermission('notifications:broadcast'), notifications.broadcast);
  router.get('/broadcasts', requirePermission('notifications:broadcast'), notifications.listBroadcasts);
  // Before `/:id`, which would otherwise take "broadcasts" as a notification id.
  router.delete('/broadcasts/:id', requirePermission('notifications:broadcast'), notifications.deleteBroadcast);
  router.delete('/broadcasts', requirePermission('notifications:broadcast'), notifications.deleteAllBroadcasts);
  router.patch('/:id/read', notifications.markRead);
  router.delete('/:id', notifications.delete);
  router.delete('/', notifications.clear);
  return router;
}
