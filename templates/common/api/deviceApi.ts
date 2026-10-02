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
  /** iOS VoIP push token for incoming calls (PushKit) – null on Android or when unavailable. */
  voipToken?: string | null;
}

/** Device requests outside sign-in: FCM token rotation or VoIP token updates. */
export const deviceApi = {
  updateFcmToken: (deviceId: string, fcmToken: string) => api.patch<null>(`/devices/${encodeURIComponent(deviceId)}`, { fcmToken }),
  updateVoipToken: (deviceId: string, voipToken: string) => api.patch<null>(`/devices/${encodeURIComponent(deviceId)}/voip-token`, { voipToken }),
};
