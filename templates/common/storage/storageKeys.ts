/** Every persisted key in one place – avoids typos and collisions. */
export const StorageKeys = {
  AUTH_TOKEN: '@{{APP_SLUG}}/auth-token',
  AUTH_REFRESH_TOKEN: '@{{APP_SLUG}}/auth-refresh-token',
  AUTH_USER: '@{{APP_SLUG}}/auth-user',
  LANGUAGE: '@{{APP_SLUG}}/language',
  PENDING_NOTIFICATION_TAP: '@{{APP_SLUG}}/pending-notification-tap',
  NOTIFICATION_INBOX: '@{{APP_SLUG}}/notification-inbox',
{{#if NOTIFICATIONS}}
  /** Identifies this app install (POST /devices). */
  DEVICE_ID: '@{{APP_SLUG}}/device-id',
{{/if}}
{{#if THEME_CONTEXT}}
  THEME_MODE: '@{{APP_SLUG}}/theme-mode',
{{/if}}
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
