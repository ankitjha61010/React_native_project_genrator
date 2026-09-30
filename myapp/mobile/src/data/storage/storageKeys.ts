/** Every persisted key in one place – avoids typos and collisions. */
export const StorageKeys = {
  AUTH_TOKEN: '@myapp/auth-token',
  AUTH_REFRESH_TOKEN: '@myapp/auth-refresh-token',
  AUTH_USER: '@myapp/auth-user',
  LANGUAGE: '@myapp/language',
  PENDING_NOTIFICATION_TAP: '@myapp/pending-notification-tap',
  NOTIFICATION_INBOX: '@myapp/notification-inbox',
  /** Identifies this app install (sent as `device.deviceId` with every sign-in). */
  DEVICE_ID: '@myapp/device-id',
  /** The FCM token the backend has for this install – a rotated one is sent once (PATCH /devices/:deviceId). */
  FCM_TOKEN: '@myapp/fcm-token',
  THEME_MODE: '@myapp/theme-mode',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
