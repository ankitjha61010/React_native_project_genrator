import { IsNull, Not, type DataSource, type Repository } from 'typeorm';
import { pageOffset, type PageQuery } from '{{IMPORT:core.pagination}}';
import type { Broadcast, BroadcastAudience, Notification, NotificationType } from '{{IMPORT:domain.notification}}';
import type { CreateNotificationData, NotificationsRepository } from '{{IMPORT:contract.notifications}}';
import { BroadcastOrmEntity, NotificationOrmEntity } from '{{IMPORT:typeorm.notifications}}';

const toNotification = (e: NotificationOrmEntity): Notification => ({
  id: e.id,
  userId: e.userId,
  type: e.type as NotificationType,
  title: e.title,
  body: e.body,
  data: e.data,
  readAt: e.readAt,
  broadcastId: e.broadcastId,
  createdAt: e.createdAt,
});
const toBroadcast = (e: BroadcastOrmEntity): Broadcast => ({
  id: e.id,
  title: e.title,
  body: e.body,
  type: e.type as NotificationType,
  data: e.data,
  audience: e.audience as BroadcastAudience,
  sentById: e.sentById,
  recipientCount: e.recipientCount,
  createdAt: e.createdAt,
});

export class TypeOrmNotificationsRepository implements NotificationsRepository {
  private readonly notifications: Repository<NotificationOrmEntity>;
  private readonly broadcasts: Repository<BroadcastOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.notifications = dataSource.getRepository(NotificationOrmEntity);
    this.broadcasts = dataSource.getRepository(BroadcastOrmEntity);
  }

  async create(data: CreateNotificationData): Promise<Notification> {
    return toNotification(await this.notifications.save(this.notifications.create({ broadcastId: null, readAt: null, ...data })));
  }

  async createMany(data: CreateNotificationData[]): Promise<number> {
    if (!data.length) return 0;
    await this.notifications.insert(data.map(d => ({ broadcastId: null, readAt: null, ...d })));
    return data.length;
  }

  async list(userId: string, query: PageQuery): Promise<{ items: Notification[]; total: number }> {
    const [entities, total] = await this.notifications.findAndCount({ where: { userId }, order: { createdAt: 'DESC', id: 'DESC' }, skip: pageOffset(query), take: query.limit });
    return { items: entities.map(toNotification), total };
  }

  countUnread(userId: string): Promise<number> {
    return this.notifications.countBy({ userId, readAt: IsNull() });
  }

  async markRead(userId: string, id: string): Promise<boolean> {
    if (!(await this.notifications.existsBy({ id, userId }))) return false;
    await this.notifications.update({ id, userId, readAt: IsNull() }, { readAt: new Date() });
    return true;
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifications.update({ userId, readAt: IsNull() }, { readAt: new Date() });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    return ((await this.notifications.delete({ id, userId })).affected ?? 0) > 0;
  }

  async deleteAll(userId: string): Promise<void> {
    await this.notifications.delete({ userId });
  }

  async createBroadcast(data: Omit<Broadcast, 'id' | 'createdAt'>): Promise<Broadcast> {
    return toBroadcast(await this.broadcasts.save(this.broadcasts.create(data)));
  }

  async listBroadcasts(query: PageQuery): Promise<{ items: Broadcast[]; total: number }> {
    const [entities, total] = await this.broadcasts.findAndCount({ order: { createdAt: 'DESC' }, skip: pageOffset(query), take: query.limit });
    return { items: entities.map(toBroadcast), total };
  }

  async deleteBroadcast(id: string): Promise<boolean> {
    return this.dataSource.transaction(async manager => {
      await manager.delete(NotificationOrmEntity, { broadcastId: id });
      return ((await manager.delete(BroadcastOrmEntity, { id })).affected ?? 0) > 0;
    });
  }

  async deleteAllBroadcasts(): Promise<number> {
    return this.dataSource.transaction(async manager => {
      await manager.delete(NotificationOrmEntity, { broadcastId: Not(IsNull()) });
      // delete({}) is refused by TypeORM ("empty criteria") – a query builder deletes every row.
      return (await manager.createQueryBuilder().delete().from(BroadcastOrmEntity).execute()).affected ?? 0;
    });
  }
}
