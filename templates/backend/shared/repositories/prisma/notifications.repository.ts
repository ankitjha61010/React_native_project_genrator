import { pageOffset, type PageQuery } from '{{IMPORT:core.pagination}}';
import type { Broadcast, BroadcastAudience, Device, DevicePlatform, Notification, NotificationData, NotificationType } from '{{IMPORT:domain.notification}}';
import type { CreateNotificationData, NotificationsRepository } from '{{IMPORT:contract.notifications}}';
import type { PrismaClient } from '{{IMPORT:db.connection}}';

type NotificationRecord = NonNullable<Awaited<ReturnType<PrismaClient['notification']['findUnique']>>>;
type BroadcastRecord = NonNullable<Awaited<ReturnType<PrismaClient['broadcast']['findUnique']>>>;
type DeviceRecord = NonNullable<Awaited<ReturnType<PrismaClient['device']['findUnique']>>>;

const toNotification = (r: NotificationRecord): Notification => ({ ...r, type: r.type as NotificationType, data: r.data as NotificationData });
const toBroadcast = (r: BroadcastRecord): Broadcast => ({ ...r, type: r.type as NotificationType, audience: r.audience as BroadcastAudience, data: r.data as NotificationData });
const toDevice = (r: DeviceRecord): Device => ({ ...r, platform: r.platform as DevicePlatform });

export class PrismaNotificationsRepository implements NotificationsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    return toNotification(await this.prisma.notification.create({ data }));
  }

  async createMany(data: CreateNotificationData[]): Promise<number> {
    return (await this.prisma.notification.createMany({ data })).count;
  }

  async list(userId: string, query: PageQuery): Promise<{ items: Notification[]; total: number }> {
    const [records, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: pageOffset(query), take: query.limit }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { items: records.map(toNotification), total };
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<boolean> {
    const exists = await this.prisma.notification.count({ where: { id, userId } });
    if (exists) await this.prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
    return exists > 0;
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    return (await this.prisma.notification.deleteMany({ where: { id, userId } })).count > 0;
  }

  async deleteAll(userId: string): Promise<void> {
    await this.prisma.notification.deleteMany({ where: { userId } });
  }

  async saveDevice(data: { userId: string; token: string; platform: DevicePlatform }): Promise<Device> {
    return toDevice(await this.prisma.device.upsert({ where: { token: data.token }, create: data, update: { userId: data.userId, platform: data.platform } }));
  }

  async removeDevice(userId: string, token: string): Promise<void> {
    await this.prisma.device.deleteMany({ where: { userId, token } });
  }

  async listDevices(userIds: string[]): Promise<Device[]> {
    if (!userIds.length) return [];
    return (await this.prisma.device.findMany({ where: { userId: { in: userIds } } })).map(toDevice);
  }

  async deleteDevicesByToken(tokens: string[]): Promise<void> {
    await this.prisma.device.deleteMany({ where: { token: { in: tokens } } });
  }

  async createBroadcast(data: Omit<Broadcast, 'id' | 'createdAt'>): Promise<Broadcast> {
    return toBroadcast(await this.prisma.broadcast.create({ data }));
  }

  async listBroadcasts(query: PageQuery): Promise<{ items: Broadcast[]; total: number }> {
    const [records, total] = await this.prisma.$transaction([
      this.prisma.broadcast.findMany({ orderBy: { createdAt: 'desc' }, skip: pageOffset(query), take: query.limit }),
      this.prisma.broadcast.count(),
    ]);
    return { items: records.map(toBroadcast), total };
  }
}
