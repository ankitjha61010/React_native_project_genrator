/* eslint-disable no-console */

/** Console logging that is silent in release builds. */
export const logger = {
  debug: (...args: unknown[]) => {
    if (__DEV__) console.log('[debug]', ...args);
  },
  info: (...args: unknown[]) => {
    if (__DEV__) console.info('[info]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (__DEV__) console.warn('[warn]', ...args);
  },
  error: (...args: unknown[]) => {
    // TODO: forward to your crash reporter (Crashlytics, Sentry…) in production.
    console.error('[error]', ...args);
  },
};
