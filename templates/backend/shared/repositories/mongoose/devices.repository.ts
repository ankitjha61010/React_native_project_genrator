import type { Device, DeviceInput, DevicePlatform } from '{{IMPORT:domain.device}}';
import type { DevicesRepository } from '{{IMPORT:contract.devices}}';
import { isValidId } from '{{IMPORT:db.connection}}';
import { DeviceModel, type DeviceDocument } from '{{IMPORT:mongoose.device}}';

const toDevice = (d: DeviceDocument): Device => ({
  id: d._id.toString(),
  userId: d.userId.toString(),
  deviceId: d.deviceId,
  token: d.token ?? null,
  platform: d.platform as DevicePlatform,
  deviceName: d.deviceName ?? null,
  osVersion: d.osVersion ?? null,
  appVersion: d.appVersion ?? null,
  lastActiveAt: d.lastActiveAt,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

export class MongooseDevicesRepository implements DevicesRepository {
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
    // A token belongs to one install – forget it on any other device.
    if (data.token) await DeviceModel.updateMany({ token: data.token, deviceId: { $ne: input.deviceId } }, { $set: { token: null } });
    const doc = await DeviceModel.findOneAndUpdate({ deviceId: input.deviceId }, { $set: data }, { upsert: true, returnDocument: 'after' }).lean<DeviceDocument>();
    return toDevice(doc);
  }

  async listByUser(userId: string): Promise<Device[]> {
    if (!isValidId(userId)) return [];
    return (await DeviceModel.find({ userId }).sort({ lastActiveAt: -1 }).lean<DeviceDocument[]>()).map(toDevice);
  }

  async listWithToken(userIds: string[]): Promise<Device[]> {
    const valid = userIds.filter(isValidId);
    return valid.length ? (await DeviceModel.find({ userId: { $in: valid }, token: { $type: 'string' } }).lean<DeviceDocument[]>()).map(toDevice) : [];
  }

  async remove(userId: string, deviceId: string): Promise<boolean> {
    if (!isValidId(userId)) return false;
    return (await DeviceModel.deleteOne({ userId, deviceId })).deletedCount > 0;
  }

  async removeTokens(tokens: string[]): Promise<void> {
    await DeviceModel.deleteMany({ token: { $in: tokens } });
  }
}
