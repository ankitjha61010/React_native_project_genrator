import { NotFoundError } from '{{IMPORT:core.errors}}';
import { toDeviceView, type DeviceInput, type DeviceView } from '{{IMPORT:domain.device}}';
import type { DevicesRepository } from '{{IMPORT:contract.devices}}';
import { DEVICES_MESSAGES } from '{{IMPORT:messages.devices}}';

/**
 * The devices a user is signed in on. The app registers its device after every sign-in
 * (register, login, social / OTP login), on every app start and when its FCM token changes;
 * it removes it on logout.
 */
export class DevicesService {
  constructor(private readonly devices: DevicesRepository) {}

  /** Creates or updates this install's device (and its FCM token). */
  async register(userId: string, input: DeviceInput): Promise<DeviceView> {
    return toDeviceView(await this.devices.save(userId, input));
  }

  async list(userId: string): Promise<DeviceView[]> {
    return (await this.devices.listByUser(userId)).map(toDeviceView);
  }

  /** Logout on this device, or "sign out that device" from a device list. */
  async remove(userId: string, deviceId: string): Promise<void> {
    if (!(await this.devices.remove(userId, deviceId))) throw new NotFoundError(DEVICES_MESSAGES.notFound);
  }

  /** FCM tokens of every device of these users (push notifications). */
  async tokensOf(userIds: string[]): Promise<string[]> {
    const devices = await this.devices.listWithToken(userIds);
    return devices.map(d => d.token).filter(token => token !== null);
  }

  /** Called with the tokens FCM rejected. */
  removeInvalidTokens(tokens: string[]): Promise<void> {
    return tokens.length ? this.devices.removeTokens(tokens) : Promise.resolve();
  }
}
