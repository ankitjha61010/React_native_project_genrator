import type { Device, DeviceInput, DeviceType } from '{{IMPORT:domain.device}}';
import type { DevicesRepository } from '{{IMPORT:contract.devices}}';
import type { PrismaClient } from '{{IMPORT:db.connection}}';

type DeviceRecord = NonNullable<Awaited<ReturnType<PrismaClient['device']['findUnique']>>>;

const toDevice = (r: DeviceRecord): Device => ({
  ...r,
  deviceType: r.deviceType as DeviceType,
  voipToken: (r as any).voipToken ?? null,
});

export class PrismaDevicesRepository implements DevicesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(userId: string, input: DeviceInput): Promise<Device> {
    const data = {
      userId,
      fcmToken: input.fcmToken ?? null,
      voipToken: input.voipToken ?? null,
      deviceType: input.deviceType,
      deviceModel: input.deviceModel ?? null,
      osVersion: input.osVersion ?? null,
      appVersion: input.appVersion ?? null,
      lastActiveAt: new Date(),
    };
    const record = await this.prisma.$transaction(async tx => {
      // A token belongs to one install – forget it on any other device.
      if (data.fcmToken) await tx.device.updateMany({ where: { fcmToken: data.fcmToken, deviceId: { not: input.deviceId } }, data: { fcmToken: null } });
      return tx.device.upsert({ where: { deviceId: input.deviceId }, create: { deviceId: input.deviceId, ...data }, update: data });
    });
    return toDevice(record);
  }

  async updateFcmToken(userId: string, deviceId: string, fcmToken: string): Promise<Device | null> {
    const record = await this.prisma.$transaction(async tx => {
      if (!(await tx.device.findFirst({ where: { userId, deviceId } }))) return null;
      await tx.device.updateMany({ where: { fcmToken, deviceId: { not: deviceId } }, data: { fcmToken: null } });
      return tx.device.update({ where: { deviceId }, data: { fcmToken, lastActiveAt: new Date() } });
    });
    return record && toDevice(record);
  }

  async updateVoipToken(userId: string, deviceId: string, voipToken: string): Promise<Device | null> {
    const record = await this.prisma.$transaction(async tx => {
      if (!(await tx.device.findFirst({ where: { userId, deviceId } }))) return null;
      return tx.device.update({ where: { deviceId }, data: { voipToken, lastActiveAt: new Date() } });
    });
    return record && toDevice(record);
  }

  async listByUser(userId: string): Promise<Device[]> {
    return (await this.prisma.device.findMany({ where: { userId }, orderBy: { lastActiveAt: 'desc' } })).map(toDevice);
  }

  async listWithToken(userIds: string[]): Promise<Device[]> {
    if (!userIds.length) return [];
    return (await this.prisma.device.findMany({ where: { userId: { in: userIds }, fcmToken: { not: null } } })).map(toDevice);
  }

  async remove(userId: string, deviceId: string): Promise<boolean> {
    return (await this.prisma.device.deleteMany({ where: { userId, deviceId } })).count > 0;
  }

  async removeAllForUser(userId: string): Promise<void> {
    await this.prisma.device.deleteMany({ where: { userId } });
  }

  async removeTokens(tokens: string[]): Promise<void> {
    await this.prisma.device.deleteMany({ where: { fcmToken: { in: tokens } } });
  }
}
