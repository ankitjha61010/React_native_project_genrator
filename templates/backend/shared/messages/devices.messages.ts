/** Every message of the devices feature – change the wording here. */
export const DEVICES_MESSAGES = {
  list: 'Devices',
  tokenUpdated: 'Push token updated',
  // ── errors ─────────────────────────────────────────────────────────────────
  notFound: { message: 'Device not found', code: 'DEVICE_NOT_FOUND' },
  /** POST /calls/voip-token without a deviceId, and the user has no iOS device (signed in without `device`). */
  noIosDevice: { message: 'No iOS device found – sign in again from the app', code: 'IOS_DEVICE_NOT_FOUND' },
} as const;
