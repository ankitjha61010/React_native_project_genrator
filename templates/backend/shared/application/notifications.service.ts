import { NotFoundError } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import { Paginated, type PageQuery } from '{{IMPORT:core.pagination}}';
import { toNotificationView, type Broadcast, type BroadcastAudience, type NotificationData, type NotificationType, type NotificationView } from '{{IMPORT:domain.notification}}';
import type { NotificationsRepository } from '{{IMPORT:contract.notifications}}';
import type { DevicesService } from '{{IMPORT:app.devicesService}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { PushMessage, PushSender } from '{{IMPORT:port.pushSender}}';
import type { Realtime } from '{{IMPORT:port.realtime}}';
{{#if VOIP_PUSH}}
import type { VoipCallPayload, VoipPushSender } from '{{IMPORT:port.voipPushSender}}';
{{/if}}
import { NOTIFICATIONS_MESSAGES } from '{{IMPORT:messages.notifications}}';
import { UserRole } from '{{IMPORT:domain.roles}}';

export interface NotifyInput {
  type?: NotificationType;
  title: string;
  body: string;
  /** Extra values for the app (all strings). `url` opens a page when the notification is tapped. */
  data?: NotificationData;
}

export interface BroadcastInput extends NotifyInput {
  audience?: BroadcastAudience;
}

export interface NotificationsDependencies {
  notifications: NotificationsRepository;
  /** Where the pushes go (every device of a user). */
  devices: DevicesService;
  users: UsersRepository;
  pushSender: PushSender;
{{#if VOIP_PUSH}}
  /** iOS VoIP (PushKit) pushes through APNs – incoming calls only. */
  voipPushSender?: VoipPushSender;
{{/if}}
  realtime: Realtime;
  logger: Logger;
}

/** Socket.IO event the app listens to (socketEvents.ts). */
export const NOTIFICATION_EVENT = 'notification:new';

/** Rows inserted per query when broadcasting. */
const BATCH = 1000;

/** The notification inbox, pushes to the users' devices and admin broadcasts. */
export class NotificationsService {
  constructor(private readonly deps: NotificationsDependencies) {}

  // ── inbox ──────────────────────────────────────────────────────────────────

  async list(userId: string, query: PageQuery): Promise<{ page: Paginated<NotificationView>; unreadCount: number }> {
    const [{ items, total }, unreadCount] = await Promise.all([this.deps.notifications.list(userId, query), this.deps.notifications.countUnread(userId)]);
    return { page: Paginated.of(items.map(toNotificationView), total, query), unreadCount };
  }

  unreadCount(userId: string): Promise<number> {
    return this.deps.notifications.countUnread(userId);
  }

  async markRead(userId: string, id: string): Promise<void> {
    if (!(await this.deps.notifications.markRead(userId, id))) throw new NotFoundError(NOTIFICATIONS_MESSAGES.notFound);
  }

  markAllRead(userId: string): Promise<void> {
    return this.deps.notifications.markAllRead(userId);
  }

  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.deps.notifications.delete(userId, id))) throw new NotFoundError(NOTIFICATIONS_MESSAGES.notFound);
  }

  clear(userId: string): Promise<void> {
    return this.deps.notifications.deleteAll(userId);
  }

  // ── sending ────────────────────────────────────────────────────────────────

  /** Inbox entry + live event + push – use it from any feature ("your order shipped"…). */
  async notify(userId: string, input: NotifyInput): Promise<NotificationView> {
    const type = input.type ?? 'general';
    const notification = await this.deps.notifications.create({ userId, type, title: input.title, body: input.body, data: input.data ?? {} });
    const view = toNotificationView(notification);
    this.deps.realtime.toUser(userId, NOTIFICATION_EVENT, view);
    await this.push([userId], { title: input.title, body: input.body, data: { ...input.data, type, notificationId: notification.id, sentAt: view.createdAt } });
    return view;
  }

  /** Admin broadcast to all users (or one role): inbox entries for everyone + one push per device. */
  async broadcast(actorId: string, input: BroadcastInput): Promise<Broadcast> {
    const { notifications, users, realtime, logger } = this.deps;
    const type = input.type ?? 'general';
    const audience = input.audience ?? 'all';
    const data = input.data ?? {};
    const recipients = await users.activeUserIds(audience === 'admins' ? UserRole.ADMIN : audience === 'users' ? UserRole.USER : undefined);

    const broadcast = await notifications.createBroadcast({ title: input.title, body: input.body, type, data, audience, sentById: actorId, recipientCount: recipients.length });
    for (let i = 0; i < recipients.length; i += BATCH) {
      await notifications.createMany(recipients.slice(i, i + BATCH).map(userId => ({ userId, type, title: input.title, body: input.body, data, broadcastId: broadcast.id })));
    }

    // Only connected apps receive it; the others see it in the inbox.
    const sentAt = broadcast.createdAt.toISOString();
    const live = { id: broadcast.id, type, title: input.title, body: input.body, data, read: false, createdAt: sentAt };
    for (const userId of recipients) realtime.toUser(userId, NOTIFICATION_EVENT, live);
    await this.push(recipients, { title: input.title, body: input.body, data: { ...data, type, broadcastId: broadcast.id, sentAt } });
    logger.info({ broadcastId: broadcast.id, audience, recipients: recipients.length }, 'Broadcast sent');
    return broadcast;
  }

  async listBroadcasts(query: PageQuery): Promise<Paginated<Broadcast>> {
    const { items, total } = await this.deps.notifications.listBroadcasts(query);
    return Paginated.of(items, total, query);
  }

  /** Admin: removes a broadcast from the history and from every recipient's inbox. */
  async deleteBroadcast(id: string): Promise<void> {
    if (!(await this.deps.notifications.deleteBroadcast(id))) throw new NotFoundError(NOTIFICATIONS_MESSAGES.broadcastNotFound);
    this.deps.logger.info({ broadcastId: id }, 'Broadcast deleted');
  }

  /** Admin: removes every broadcast (and its inbox entries). Returns how many were removed. */
  async deleteAllBroadcasts(): Promise<number> {
    const deleted = await this.deps.notifications.deleteAllBroadcasts();
    this.deps.logger.info({ deleted }, 'All broadcasts deleted');
    return deleted;
  }

  /** Pushes to every device of these users; tokens FCM rejects are removed. */
  async push(userIds: string[], message: PushMessage): Promise<void> {
    const tokens = await this.deps.devices.tokensOf(userIds);
    if (!tokens.length) return;
    const { invalidTokens } = await this.deps.pushSender.send(tokens, message);
    await this.deps.devices.removeInvalidTokens(invalidTokens);
  }
{{#if VOIP_PUSH}}

  /**
   * iOS VoIP push (PushKit) of an incoming call to these users' iOS devices that registered a VoIP token. Only
   * for a call that is ringing: iOS requires every VoIP push to report a call to CallKit (never for "call ended").
   */
  async pushVoip(userIds: string[], payload: VoipCallPayload, ttlSeconds?: number): Promise<void> {
    if (!this.deps.voipPushSender) return;
    const tokens = await this.deps.devices.voipTokensOf(userIds);
    if (!tokens.length) return;
    const { invalidTokens } = await this.deps.voipPushSender.send(tokens, payload, ttlSeconds);
    await this.deps.devices.clearInvalidVoipTokens(invalidTokens);
  }
{{/if}}
}
