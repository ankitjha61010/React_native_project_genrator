import type { Request, Response } from 'express';
import type { NotificationsService } from '{{IMPORT:app.notificationsService}}';
import type { Broadcast } from '{{IMPORT:domain.notification}}';
import { currentUser } from '{{IMPORT:ex.mw.auth}}';
import { sendSuccess } from '{{IMPORT:ex.respond}}';
import { idParams, pageQuery } from '{{IMPORT:ex.schemas}}';
import { parseBody, parseParams, parseQuery } from '{{IMPORT:ex.validation}}';
import { broadcastSchema } from '{{IMPORT:ex.notifications.schemas}}';
import { NOTIFICATIONS_MESSAGES } from '{{IMPORT:messages.notifications}}';

/** What the client sees of a broadcast. */
const broadcastView = ({ id, title, body, type, audience, recipientCount, createdAt }: Broadcast) => ({ id, title, body, type, audience, recipientCount, createdAt: createdAt.toISOString() });

/** Handles `/notifications` requests: the inbox and admin broadcasts (devices: devices.controller.ts). */
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** GET /notifications?page=1 – newest first, `meta.unreadCount` */
  list = async (req: Request, res: Response) => {
    const { page, unreadCount } = await this.notifications.list(currentUser(req).id, parseQuery(pageQuery, req));
    sendSuccess(res, NOTIFICATIONS_MESSAGES.list, page, { meta: { unreadCount } });
  };

  /** GET /notifications/unread-count – for the badge */
  unreadCount = async (req: Request, res: Response) => {
    sendSuccess(res, NOTIFICATIONS_MESSAGES.unreadCount, { count: await this.notifications.unreadCount(currentUser(req).id) });
  };

  /** POST /notifications/read-all */
  markAllRead = async (req: Request, res: Response) => {
    await this.notifications.markAllRead(currentUser(req).id);
    sendSuccess(res, NOTIFICATIONS_MESSAGES.allRead);
  };

  /** POST /notifications/broadcast (admin) – to all users or one audience */
  broadcast = async (req: Request, res: Response) => {
    const broadcast = await this.notifications.broadcast(currentUser(req).id, parseBody(broadcastSchema, req));
    sendSuccess(res, NOTIFICATIONS_MESSAGES.broadcastSent, broadcastView(broadcast), { status: 201 });
  };

  /** GET /notifications/broadcasts (admin) */
  listBroadcasts = async (req: Request, res: Response) => {
    const broadcasts = await this.notifications.listBroadcasts(parseQuery(pageQuery, req));
    sendSuccess(res, NOTIFICATIONS_MESSAGES.broadcasts, broadcasts.map(broadcastView));
  };

  /** PATCH /notifications/:id/read */
  markRead = async (req: Request, res: Response) => {
    const { id } = parseParams(idParams, req);
    await this.notifications.markRead(currentUser(req).id, id);
    sendSuccess(res, NOTIFICATIONS_MESSAGES.read);
  };

  /** DELETE /notifications/:id */
  delete = async (req: Request, res: Response) => {
    const { id } = parseParams(idParams, req);
    await this.notifications.delete(currentUser(req).id, id);
    sendSuccess(res, NOTIFICATIONS_MESSAGES.deleted);
  };

  /** DELETE /notifications – all of yours */
  clear = async (req: Request, res: Response) => {
    await this.notifications.clear(currentUser(req).id);
    sendSuccess(res, NOTIFICATIONS_MESSAGES.cleared);
  };
}
