import { In, Not, IsNull, type DataSource, type Repository } from 'typeorm';
import { DeviceType, type Device, type DeviceInput } from '{{IMPORT:domain.device}}';
import type { DevicesRepository } from '{{IMPORT:contract.devices}}';
import { DeviceOrmEntity } from '{{IMPORT:typeorm.device}}';

const toDevice = (e: DeviceOrmEntity): Device => ({
  id: e.id,
  userId: e.userId,
  deviceId: e.deviceId,
  fcmToken: e.fcmToken,
  voipToken: e.voipToken ?? null,
  deviceType: e.deviceType,
  deviceModel: e.deviceModel,
  osVersion: e.osVersion,
  appVersion: e.appVersion,
  lastActiveAt: e.lastActiveAt,
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
});

export class TypeOrmDevicesRepository implements DevicesRepository {
  private readonly devices: Repository<DeviceOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.devices = dataSource.getRepository(DeviceOrmEntity);
  }

  save(userId: string, input: DeviceInput): Promise<Device> {
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
    return this.dataSource.transaction(async manager => {
      // A token belongs to one install – forget it on any other device.
      if (data.fcmToken) await manager.update(DeviceOrmEntity, { fcmToken: data.fcmToken, deviceId: Not(input.deviceId) }, { fcmToken: null });
      await manager.upsert(DeviceOrmEntity, { deviceId: input.deviceId, ...data }, ['deviceId']);
      return toDevice(await manager.findOneByOrFail(DeviceOrmEntity, { deviceId: input.deviceId }));
    });
  }

  updateFcmToken(userId: string, deviceId: string, fcmToken: string): Promise<Device | null> {
    return this.dataSource.transaction(async manager => {
      const device = await manager.findOneBy(DeviceOrmEntity, { userId, deviceId });
      if (!device) return null;
      await manager.update(DeviceOrmEntity, { fcmToken, deviceId: Not(deviceId) }, { fcmToken: null });
      await manager.update(DeviceOrmEntity, { deviceId }, { fcmToken, lastActiveAt: new Date() });
      return toDevice(await manager.findOneByOrFail(DeviceOrmEntity, { deviceId }));
    });
  }

  updateVoipToken(userId: string, deviceId: string, voipToken: string): Promise<Device | null> {
    return this.dataSource.transaction(async manager => {
      const device = await manager.findOneBy(DeviceOrmEntity, { userId, deviceId });
      if (!device) return null;
      await manager.update(DeviceOrmEntity, { deviceId }, { voipToken, lastActiveAt: new Date() });
      return toDevice(await manager.findOneByOrFail(DeviceOrmEntity, { deviceId }));
    });
  }

  async listByUser(userId: string): Promise<Device[]> {
    return (await this.devices.find({ where: { userId }, order: { lastActiveAt: 'DESC' } })).map(toDevice);
  }

  async listWithToken(userIds: string[]): Promise<Device[]> {
    return userIds.length ? (await this.devices.findBy({ userId: In(userIds), fcmToken: Not(IsNull()) })).map(toDevice) : [];
  }

  async remove(userId: string, deviceId: string): Promise<boolean> {
    return ((await this.devices.delete({ userId, deviceId })).affected ?? 0) > 0;
  }

  async removeAllForUser(userId: string): Promise<void> {
    await this.devices.delete({ userId });
  }

  async removeTokens(tokens: string[]): Promise<void> {
    await this.devices.delete({ fcmToken: In(tokens) });
  }

  async listWithVoipToken(userIds: string[]): Promise<Device[]> {
    return userIds.length ? (await this.devices.findBy({ userId: In(userIds), deviceType: DeviceType.IOS, voipToken: Not(IsNull()) })).map(toDevice) : [];
  }

  async clearVoipTokens(tokens: string[]): Promise<void> {
    await this.devices.update({ voipToken: In(tokens) }, { voipToken: null });
  }
}
