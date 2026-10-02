import type { Device, DeviceInput } from '{{IMPORT:domain.device}}';
import type { DevicesRepository } from '{{IMPORT:contract.devices}}';
import { isValidId } from '{{IMPORT:db.connection}}';
import { DeviceModel, type DeviceDocument } from '{{IMPORT:mongoose.device}}';

const toDevice = (d: DeviceDocument): Device => ({
  id: d._id.toString(),
  userId: d.userId.toString(),
  deviceId: d.deviceId,
  fcmToken: d.fcmToken ?? null,
  voipToken: (d as any).voipToken ?? null,
  deviceType: d.deviceType,
  deviceModel: d.deviceModel ?? null,
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
      fcmToken: input.fcmToken ?? null,
      voipToken: input.voipToken ?? null,
      deviceType: input.deviceType,
      deviceModel: input.deviceModel ?? null,
      osVersion: input.osVersion ?? null,
      appVersion: input.appVersion ?? null,
      lastActiveAt: new Date(),
    };
    // A token belongs to one install – forget it on any other device.
    if (data.fcmToken) await DeviceModel.updateMany({ fcmToken: data.fcmToken, deviceId: { $ne: input.deviceId } }, { $set: { fcmToken: null } });
    const doc = await DeviceModel.findOneAndUpdate({ deviceId: input.deviceId }, { $set: data }, { upsert: true, returnDocument: 'after' }).lean<DeviceDocument>();
    return toDevice(doc);
  }

  async updateFcmToken(userId: string, deviceId: string, fcmToken: string): Promise<Device | null> {
    if (!isValidId(userId) || !(await DeviceModel.exists({ userId, deviceId }))) return null;
    await DeviceModel.updateMany({ fcmToken, deviceId: { $ne: deviceId } }, { $set: { fcmToken: null } });
    const doc = await DeviceModel.findOneAndUpdate({ userId, deviceId }, { $set: { fcmToken, lastActiveAt: new Date() } }, { returnDocument: 'after' }).lean<DeviceDocument>();
    return doc && toDevice(doc);
  }

  async updateVoipToken(userId: string, deviceId: string, voipToken: string): Promise<Device | null> {
    if (!isValidId(userId) || !(await DeviceModel.exists({ userId, deviceId }))) return null;
    const doc = await DeviceModel.findOneAndUpdate({ userId, deviceId }, { $set: { voipToken, lastActiveAt: new Date() } }, { returnDocument: 'after' }).lean<DeviceDocument>();
    return doc && toDevice(doc);
  }

  async listByUser(userId: string): Promise<Device[]> {
    if (!isValidId(userId)) return [];
    return (await DeviceModel.find({ userId }).sort({ lastActiveAt: -1 }).lean<DeviceDocument[]>()).map(toDevice);
  }

  async listWithToken(userIds: string[]): Promise<Device[]> {
    const valid = userIds.filter(isValidId);
    return valid.length ? (await DeviceModel.find({ userId: { $in: valid }, fcmToken: { $type: 'string' } }).lean<DeviceDocument[]>()).map(toDevice) : [];
  }

  async remove(userId: string, deviceId: string): Promise<boolean> {
    if (!isValidId(userId)) return false;
    return (await DeviceModel.deleteOne({ userId, deviceId })).deletedCount > 0;
  }

  async removeAllForUser(userId: string): Promise<void> {
    if (isValidId(userId)) await DeviceModel.deleteMany({ userId });
  }

  async removeTokens(tokens: string[]): Promise<void> {
    await DeviceModel.deleteMany({ fcmToken: { $in: tokens } });
  }
}
