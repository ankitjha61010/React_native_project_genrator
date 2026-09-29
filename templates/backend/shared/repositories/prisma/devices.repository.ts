import type { Device, DeviceInput, DevicePlatform } from '{{IMPORT:domain.device}}';
import type { DevicesRepository } from '{{IMPORT:contract.devices}}';
import type { PrismaClient } from '{{IMPORT:db.connection}}';

type DeviceRecord = NonNullable<Awaited<ReturnType<PrismaClient['device']['findUnique']>>>;

const toDevice = (r: DeviceRecord): Device => ({ ...r, platform: r.platform as DevicePlatform });

export class PrismaDevicesRepository implements DevicesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(userId: string, input: DeviceInput): Promise<Device> {
    const data = {
      userId,
      token: input.token ?? null,
      platform: input.platform,
      deviceName: input.deviceName ?? null,
      osVersion: input.osVersion ?? null,
      appVersion: input.appVersion ?? null,
      lastActiveAt: new Date(),
    };
    const record = await this.prisma.$transaction(async tx => {
      // A token belongs to one install – forget it on any other device.
      if (data.token) await tx.device.updateMany({ where: { token: data.token, deviceId: { not: input.deviceId } }, data: { token: null } });
      return tx.device.upsert({ where: { deviceId: input.deviceId }, create: { deviceId: input.deviceId, ...data }, update: data });
    });
    return toDevice(record);
  }

  async listByUser(userId: string): Promise<Device[]> {
    return (await this.prisma.device.findMany({ where: { userId }, orderBy: { lastActiveAt: 'desc' } })).map(toDevice);
  }

  async listWithToken(userIds: string[]): Promise<Device[]> {
    if (!userIds.length) return [];
    return (await this.prisma.device.findMany({ where: { userId: { in: userIds }, token: { not: null } } })).map(toDevice);
  }

  async remove(userId: string, deviceId: string): Promise<boolean> {
    return (await this.prisma.device.deleteMany({ where: { userId, deviceId } })).count > 0;
  }

  async removeTokens(tokens: string[]): Promise<void> {
    await this.prisma.device.deleteMany({ where: { token: { in: tokens } } });
  }
}
