import { NotFoundError } from '{{IMPORT:core.errors}}';
import { DeviceType, toDeviceView, type DeviceInput, type DeviceRegistry, type DeviceView } from '{{IMPORT:domain.device}}';
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

  /**
   * POST /calls/voip-token – the app sends its PushKit token, usually without saying which install it is.
   * With a `deviceId` this is updateVoipToken(). Without one the token goes to the user's most recently active
   * iOS device only – not to every iOS device: a VoIP token identifies exactly one install, and copying it to the
   * user's other iPhones / iPads would ring the same phone several times (and keep dead tokens alive). The
   * install that just sent the token is the one that signed in / refreshed most recently; the app also sends
   * PATCH /devices/:deviceId/voip-token, which pins the token to the exact install.
   */
  async registerVoipToken(userId: string, voipToken: string, deviceId?: string): Promise<DeviceView> {
    if (deviceId) return this.updateVoipToken(userId, deviceId, voipToken);
    // listByUser is most recently active first.
    const latestIos = (await this.devices.listByUser(userId)).find(d => d.deviceType === DeviceType.IOS);
    if (!latestIos) throw new NotFoundError(DEVICES_MESSAGES.noIosDevice);
    return this.updateVoipToken(userId, latestIos.deviceId, voipToken);
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

  /** VoIP (PushKit) tokens of these users' iOS devices (incoming calls). */
  async voipTokensOf(userIds: string[]): Promise<string[]> {
    const devices = await this.devices.listWithVoipToken(userIds);
    return devices.map(d => d.voipToken).filter(token => token !== null);
  }

  /** Called with the VoIP tokens APNs rejected – the devices stay (their FCM token still works). */
  clearInvalidVoipTokens(tokens: string[]): Promise<void> {
    return tokens.length ? this.devices.clearVoipTokens(tokens) : Promise.resolve();
  }
}
