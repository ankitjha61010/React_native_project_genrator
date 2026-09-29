import { In, Not, IsNull, type DataSource, type Repository } from 'typeorm';
import type { Device, DeviceInput, DevicePlatform } from '{{IMPORT:domain.device}}';
import type { DevicesRepository } from '{{IMPORT:contract.devices}}';
import { DeviceOrmEntity } from '{{IMPORT:typeorm.device}}';

const toDevice = (e: DeviceOrmEntity): Device => ({
  id: e.id,
  userId: e.userId,
  deviceId: e.deviceId,
  token: e.token,
  platform: e.platform as DevicePlatform,
  deviceName: e.deviceName,
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
      token: input.token ?? null,
      platform: input.platform,
      deviceName: input.deviceName ?? null,
      osVersion: input.osVersion ?? null,
      appVersion: input.appVersion ?? null,
      lastActiveAt: new Date(),
    };
    return this.dataSource.transaction(async manager => {
      // A token belongs to one install – forget it on any other device.
      if (data.token) await manager.update(DeviceOrmEntity, { token: data.token, deviceId: Not(input.deviceId) }, { token: null });
      await manager.upsert(DeviceOrmEntity, { deviceId: input.deviceId, ...data }, ['deviceId']);
      return toDevice(await manager.findOneByOrFail(DeviceOrmEntity, { deviceId: input.deviceId }));
    });
  }

  async listByUser(userId: string): Promise<Device[]> {
    return (await this.devices.find({ where: { userId }, order: { lastActiveAt: 'DESC' } })).map(toDevice);
  }

  async listWithToken(userIds: string[]): Promise<Device[]> {
    return userIds.length ? (await this.devices.findBy({ userId: In(userIds), token: Not(IsNull()) })).map(toDevice) : [];
  }

  async remove(userId: string, deviceId: string): Promise<boolean> {
    return ((await this.devices.delete({ userId, deviceId })).affected ?? 0) > 0;
  }

  async removeTokens(tokens: string[]): Promise<void> {
    await this.devices.delete({ token: In(tokens) });
  }
}
