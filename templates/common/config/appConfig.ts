import { env } from '{{IMPORT:config.env}}';

export const appConfig = {
  appName: '{{DISPLAY_NAME}}',
  api: {
    baseUrl: env.apiBaseUrl,
    timeoutMs: 15_000,
{{#if API_ENCRYPTION}}
    /** AES payload encryption – see api/apiEncryption.ts. */
    encryption: env.apiEncryption,
{{/if}}
  },
  /** DEMO: simulated splash initialisation time. */
  splashDelayMs: 1200,
  defaultLanguage: 'en',
} as const;
