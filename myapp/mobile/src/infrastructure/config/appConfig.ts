import { env } from '@infrastructure/config/env';

export const appConfig = {
  appName: 'myapp',
  /** Sent with the device registration – keep in sync with versionName (Android) / MARKETING_VERSION (iOS). */
  version: '1.0.0',
  api: {
    baseUrl: env.apiBaseUrl,
    timeoutMs: 15_000,
    /** AES payload encryption – see api/apiEncryption.ts. */
    encryption: env.apiEncryption,
  },
  /** DEMO: simulated splash initialisation time. */
  splashDelayMs: 1200,
  defaultLanguage: 'en',
} as const;
