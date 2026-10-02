import { NotFoundError } from '{{IMPORT:core.errors}}';
import { toDeviceView, type DeviceInput, type DeviceRegistry, type DeviceView } from '{{IMPORT:domain.device}}';
import type { DevicesRepository } from '{{IMPORT:contract.devices}}';
import { DEVICES_MESSAGES } from '{{IMPORT:messages.devices}}';

/**
 * The devices a user is signed in on – one row per app install. There is no "register device"
 * request: the app sends its `device` with login / register / OTP / social sign-in / refresh
 * and AuthService saves it here; logout removes it. The app only calls this feature directly
 * when FCM rotates its token.
 */
export class DevicesService implements DeviceRegistry {
  constructor(private readonly devices: DevicesRepository) {}

  /** Creates or updates this install's device (and its FCM token) – from the sign-in payload. */
  async save(userId: string, input: DeviceInput): Promise<void> {
    await this.devices.save(userId, input);
  }

  /** FCM rotated the token of this install. */
  async updateFcmToken(userId: string, deviceId: string, fcmToken: string): Promise<DeviceView> {
    const device = await this.devices.updateFcmToken(userId, deviceId, fcmToken);
    if (!device) throw new NotFoundError(DEVICES_MESSAGES.notFound);
    return toDeviceView(device);
  }

  /** Update iOS VoIP push token for CallKit incoming calls. */
  async updateVoipToken(userId: string, deviceId: string, voipToken: string): Promise<DeviceView> {
    const device = await this.devices.updateVoipToken(userId, deviceId, voipToken);
    if (!device) throw new NotFoundError(DEVICES_MESSAGES.notFound);
    return toDeviceView(device);
  }

  async list(userId: string): Promise<DeviceView[]> {
    return (await this.devices.listByUser(userId)).map(toDeviceView);
  }

  /** Logout on this install: it gets no more pushes for the user. */
  async remove(userId: string, deviceId: string): Promise<void> {
    await this.devices.remove(userId, deviceId);
  }

  /** Signed out everywhere: no device gets pushes for the user any more. */
  removeAll(userId: string): Promise<void> {
    return this.devices.removeAllForUser(userId);
  }

  /** FCM tokens of every device of these users (push notifications). */
  async tokensOf(userIds: string[]): Promise<string[]> {
    const devices = await this.devices.listWithToken(userIds);
    return devices.map(d => d.fcmToken).filter(token => token !== null);
  }

  /** Called with the tokens FCM rejected. */
  removeInvalidTokens(tokens: string[]): Promise<void> {
    return tokens.length ? this.devices.removeTokens(tokens) : Promise.resolve();
  }
}
