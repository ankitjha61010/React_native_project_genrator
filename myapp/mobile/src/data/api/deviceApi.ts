import { api } from './apiClient';

/**
 * This app install, as the backend stores it. Sent as `device` in the login / register / OTP /
 * social sign-in / refresh bodies – the backend saves it while signing in, so there is no
 * separate "register device" request.
 */
export interface DeviceInfo {
  /** Generated once per install (see deviceInfo.ts). */
  deviceId: string;
  deviceType: 'IOS' | 'ANDROID';
  /** e.g. "Google Pixel 8" / "iPhone". */
  deviceModel: string | null;
  osVersion: string | null;
  appVersion: string | null;
  /** FCM registration token – null when push is unavailable (no permission, simulator…). */
  fcmToken: string | null;
}

/** The only device request outside sign-in: FCM rotated this install's token. */
export const deviceApi = {
  updateFcmToken: (deviceId: string, fcmToken: string) => api.patch<null>(`/devices/${encodeURIComponent(deviceId)}`, { fcmToken }),
};
