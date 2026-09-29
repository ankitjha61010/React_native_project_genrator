import { api } from './apiClient';

/** This app install, as the backend stores it (POST /devices). */
export interface DeviceInfo {
  /** Generated once per install (see deviceInfo.ts). */
  deviceId: string;
  /** FCM registration token – null when push is unavailable (no permission, simulator…). */
  token: string | null;
  platform: 'ios' | 'android';
  deviceName: string | null;
  osVersion: string | null;
  appVersion: string | null;
}

/** The user's devices: pushes go to every device that has a token. */
export const deviceApi = {
  /** Creates / updates this install – after every sign-in, on app start and when the FCM token changes. */
  register: (device: DeviceInfo) => api.post<null>('/devices', device),

  /** On logout: this device gets no more pushes for the user. */
  remove: (deviceId: string) => api.delete<null>(`/devices/${encodeURIComponent(deviceId)}`, { skipAuthRefresh: true }),
};
