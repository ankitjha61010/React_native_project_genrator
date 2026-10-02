import { pageOffset, type PageQuery } from '{{IMPORT:core.pagination}}';
import type { Broadcast, BroadcastAudience, Notification, NotificationData, NotificationType } from '{{IMPORT:domain.notification}}';
import type { CreateNotificationData, NotificationsRepository } from '{{IMPORT:contract.notifications}}';
import { isValidId } from '{{IMPORT:db.connection}}';
import { BroadcastModel, NotificationModel, type BroadcastDocument, type NotificationDocument } from '{{IMPORT:mongoose.notifications}}';

const toNotification = (d: NotificationDocument): Notification => ({
  id: d._id.toString(),
  userId: d.userId.toString(),
  type: d.type as NotificationType,
  title: d.title,
  body: d.body,
  data: (d.data ?? {}) as NotificationData,
  readAt: d.readAt ?? null,
  broadcastId: d.broadcastId?.toString() ?? null,
  createdAt: d.createdAt,
});
const toBroadcast = (d: BroadcastDocument): Broadcast => ({
  id: d._id.toString(),
  title: d.title,
  body: d.body,
  type: d.type as NotificationType,
  data: (d.data ?? {}) as NotificationData,
  audience: d.audience as BroadcastAudience,
  sentById: d.sentById.toString(),
  recipientCount: d.recipientCount,
  createdAt: d.createdAt,
});

export class MongooseNotificationsRepository implements NotificationsRepository {
  async create(data: CreateNotificationData): Promise<Notification> {
    return toNotification((await NotificationModel.create(data)).toObject<NotificationDocument>());
  }

  async createMany(data: CreateNotificationData[]): Promise<number> {
    if (!data.length) return 0;
    return (await NotificationModel.insertMany(data, { ordered: false })).length;
  }

  async list(userId: string, query: PageQuery): Promise<{ items: Notification[]; total: number }> {
    const [docs, total] = await Promise.all([
      NotificationModel.find({ userId }).sort({ createdAt: -1, _id: -1 }).skip(pageOffset(query)).limit(query.limit).lean<NotificationDocument[]>(),
      NotificationModel.countDocuments({ userId }),
    ]);
    return { items: docs.map(toNotification), total };
  }

  countUnread(userId: string): Promise<number> {
    return NotificationModel.countDocuments({ userId, readAt: null });
  }

  async markRead(userId: string, id: string): Promise<boolean> {
    if (!isValidId(id)) return false;
    const found = await NotificationModel.exists({ _id: id, userId });
    if (found) await NotificationModel.updateOne({ _id: id, readAt: null }, { $set: { readAt: new Date() } });
    return !!found;
  }

  async markAllRead(userId: string): Promise<void> {
    await NotificationModel.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    return isValidId(id) && (await NotificationModel.deleteOne({ _id: id, userId })).deletedCount > 0;
  }

  async deleteAll(userId: string): Promise<void> {
    await NotificationModel.deleteMany({ userId });
  }

  async createBroadcast(data: Omit<Broadcast, 'id' | 'createdAt'>): Promise<Broadcast> {
    return toBroadcast((await BroadcastModel.create(data)).toObject<BroadcastDocument>());
  }

  async listBroadcasts(query: PageQuery): Promise<{ items: Broadcast[]; total: number }> {
    const [docs, total] = await Promise.all([BroadcastModel.find().sort({ createdAt: -1 }).skip(pageOffset(query)).limit(query.limit).lean<BroadcastDocument[]>(), BroadcastModel.countDocuments()]);
    return { items: docs.map(toBroadcast), total };
  }

  async deleteBroadcast(id: string): Promise<boolean> {
    if (!isValidId(id)) return false;
    await NotificationModel.deleteMany({ broadcastId: id });
    return (await BroadcastModel.deleteOne({ _id: id })).deletedCount > 0;
  }

  async deleteAllBroadcasts(): Promise<number> {
    await NotificationModel.deleteMany({ broadcastId: { $ne: null } });
    return (await BroadcastModel.deleteMany({})).deletedCount;
  }
}
