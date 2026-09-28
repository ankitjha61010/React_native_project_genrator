{{#if API_ENCRYPTION}}
import {
  API_BASE_URL,
  API_ENCRYPTION_ENABLED,
  API_ENCRYPTION_IV,
  API_ENCRYPTION_KEY,
  APP_ENV,
  PRIVACY_POLICY_URL,
  TERMS_URL,
} from '@env';
{{else}}
import { API_BASE_URL, APP_ENV, PRIVACY_POLICY_URL, TERMS_URL } from '@env';
{{/if}}
{{#if SOCIAL_GOOGLE}}
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@env';
{{/if}}

export type AppEnvironment = 'development' | 'staging' | 'production';

function readEnvironment(value: string | undefined): AppEnvironment {
  return value === 'staging' || value === 'production' ? value : 'development';
}

/**
 * Typed access to `.env` values (loaded at build time by react-native-dotenv).
 * Restart Metro with `npm start -- --reset-cache` after changing `.env`.
 */
export const env = {
  apiBaseUrl: API_BASE_URL ?? '',
  appEnv: readEnvironment(APP_ENV),
  /** Legal pages shown in the in-app WebView. */
  legal: {
    termsUrl: TERMS_URL ?? '',
    privacyPolicyUrl: PRIVACY_POLICY_URL ?? '',
  },
{{#if API_ENCRYPTION}}
  apiEncryption: {
    enabled: API_ENCRYPTION_ENABLED !== 'false',
    key: API_ENCRYPTION_KEY ?? '',
    iv: API_ENCRYPTION_IV ?? '',
  },
{{/if}}
{{#if SOCIAL_GOOGLE}}
  google: {
    webClientId: GOOGLE_WEB_CLIENT_ID ?? '',
    iosClientId: GOOGLE_IOS_CLIENT_ID ?? '',
  },
{{/if}}
} as const;

export const isProduction = env.appEnv === 'production';
