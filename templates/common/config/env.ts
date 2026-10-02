{{#if API_ENCRYPTION}}
import {
  API_BASE_URL,
  API_ENCRYPTION_ENABLED,
  API_ENCRYPTION_IV,
  API_ENCRYPTION_KEY,
  APP_ENV,
} from '@env';
{{else}}
import { API_BASE_URL, APP_ENV } from '@env';
{{/if}}
{{#if SOCKET}}
import { SOCKET_URL } from '@env';
{{/if}}
import { Platform } from 'react-native';
{{#if SOCIAL_GOOGLE}}
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@env';
{{/if}}
{{#if GOOGLE_LOCATION}}
import { GOOGLE_MAPS_API_KEY } from '@env';
{{/if}}
{{#if IAP_ADAPTY}}
import { ADAPTY_PLACEMENT_ID, ADAPTY_PUBLIC_SDK_KEY } from '@env';
{{/if}}

export type AppEnvironment = 'development' | 'staging' | 'production';

/**
 * The Android emulator reaches the development machine at 10.0.2.2, not localhost. Also used
 * for URLs the backend sends (avatars, chat media, legal pages) – see `deviceUrl`.
 */
export function forDevice(url: string): string {
  return Platform.OS === 'android' ? url.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, '//10.0.2.2') : url;
}

{{#if SOCKET}}
/** "http://host:3000/api/v1" → "http://host:3000" */
function originOf(url: string): string {
  return /^(https?:\/\/[^/]+)/.exec(url)?.[1] ?? url;
}
{{/if}}

function readEnvironment(value: string | undefined): AppEnvironment {
  return value === 'staging' || value === 'production' ? value : 'development';
}

/**
 * Typed access to `.env` values (loaded at build time by react-native-dotenv).
 * Restart Metro with `npm start -- --reset-cache` after changing `.env`.
 */
export const env = {
  /** e.g. http://localhost:3000/api/v1 */
  apiBaseUrl: forDevice(API_BASE_URL ?? ''),
{{#if SOCKET}}
  /** Socket.IO runs on the API's host and port. */
  socketUrl: forDevice(SOCKET_URL || originOf(API_BASE_URL ?? '')),
{{/if}}
  appEnv: readEnvironment(APP_ENV),
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
{{#if GOOGLE_LOCATION}}
  /** Places search + reverse geocoding (Google Location SDK). */
  googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? '',
{{/if}}
{{#if IAP_ADAPTY}}
  /** Adapty (in-app purchases): the public SDK key and the placement whose paywall products are sold. */
  adapty: {
    publicSdkKey: ADAPTY_PUBLIC_SDK_KEY ?? '',
    placementId: ADAPTY_PLACEMENT_ID || 'premium',
  },
{{/if}}
} as const;

export const isProduction = env.appEnv === 'production';
