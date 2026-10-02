/** Every persisted key in one place – avoids typos and collisions. */
export const StorageKeys = {
  AUTH_TOKEN: '@{{APP_SLUG}}/auth-token',
  AUTH_REFRESH_TOKEN: '@{{APP_SLUG}}/auth-refresh-token',
  AUTH_USER: '@{{APP_SLUG}}/auth-user',
  LANGUAGE: '@{{APP_SLUG}}/language',
  PENDING_NOTIFICATION_TAP: '@{{APP_SLUG}}/pending-notification-tap',
  NOTIFICATION_INBOX: '@{{APP_SLUG}}/notification-inbox',
  /** Identifies this app install (sent as `device.deviceId` with every sign-in). */
  DEVICE_ID: '@{{APP_SLUG}}/device-id',
{{#if NOTIFICATIONS}}
  /** The FCM token the backend has for this install – a rotated one is sent once (PATCH /devices/:deviceId). */
  FCM_TOKEN: '@{{APP_SLUG}}/fcm-token',
{{/if}}
{{#if HAS_CALLING}}
  /** VoIP push token for incoming calls on iOS (PushKit). */
  VOIP_TOKEN: '@{{APP_SLUG}}/voip-token',
{{/if}}
{{#if THEME_CONTEXT}}
  THEME_MODE: '@{{APP_SLUG}}/theme-mode',
{{/if}}
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
