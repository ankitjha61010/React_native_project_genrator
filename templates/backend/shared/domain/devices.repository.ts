import type { Device, DeviceInput } from '{{IMPORT:domain.device}}';

/** The users' devices (app installs) and their FCM tokens – one `devices` row per install. */
export interface DevicesRepository {
  /**
   * Creates or updates the device with this `deviceId` for the user (another user signing in on
   * the same install takes it over) and marks it active now. A token can only belong to one
   * device, so it is removed from any other device first.
   */
  save(userId: string, input: DeviceInput): Promise<Device>;
  /** FCM rotated the token of one of the user's devices. Null when the user has no such device. */
  updateFcmToken(userId: string, deviceId: string, fcmToken: string): Promise<Device | null>;
  /** Updates the iOS VoIP push token for the user's device. */
  updateVoipToken(userId: string, deviceId: string, voipToken: string): Promise<Device | null>;
  listByUser(userId: string): Promise<Device[]>;
  /** Devices of these users that can receive pushes (they have a token). */
  listWithToken(userIds: string[]): Promise<Device[]>;
  /** Logout on one install. False when the user has no device with this id. */
  remove(userId: string, deviceId: string): Promise<boolean>;
  /** "Sign out everywhere". */
  removeAllForUser(userId: string): Promise<void>;
  /** Tokens FCM reported as no longer valid (the app was uninstalled…). */
  removeTokens(tokens: string[]): Promise<void>;
}
