/** Every persisted key in one place – avoids typos and collisions. */
export const StorageKeys = {
  AUTH_TOKEN: '@{{APP_SLUG}}/auth-token',
  AUTH_USER: '@{{APP_SLUG}}/auth-user',
  LANGUAGE: '@{{APP_SLUG}}/language',
  PENDING_NOTIFICATION_TAP: '@{{APP_SLUG}}/pending-notification-tap',
  NOTIFICATION_INBOX: '@{{APP_SLUG}}/notification-inbox',
{{#if THEME_CONTEXT}}
  THEME_MODE: '@{{APP_SLUG}}/theme-mode',
{{/if}}
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
