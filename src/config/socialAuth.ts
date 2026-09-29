/** Which social login providers the app offers (each one independently). Apple is iOS-only at runtime. */
export interface SocialProviders {
  google: boolean;
  facebook: boolean;
  apple: boolean;
}

/**
 * Credentials entered while generating ("Configure"). A provider that was skipped keeps
 * YOUR_… placeholders – every one of them is listed in the generated docs/SOCIAL_LOGIN.md.
 */
export interface SocialCredentials {
  /** Google Cloud → Credentials → OAuth client (Web application). Both apps use it to get an ID token. */
  googleWebClientId?: string;
  /** OAuth client (iOS) – its reversed form is the iOS URL scheme. */
  googleIosClientId?: string;
  facebookAppId?: string;
  facebookClientToken?: string;
  /** Backend only (verifies Facebook tokens) – never written into the app. */
  facebookAppSecret?: string;
  /** Apple Services ID – only for Sign in with Apple on the web / Android; the bundle id is always accepted. */
  appleServiceId?: string;
}

export const NO_SOCIAL: SocialProviders = { google: false, facebook: false, apple: false };

/** Old `--social-auth` values, still accepted. */
const LEGACY: Record<string, SocialProviders> = {
  none: NO_SOCIAL,
  google: { google: true, facebook: false, apple: false },
  facebook: { google: false, facebook: true, apple: false },
  'google-facebook': { google: true, facebook: true, apple: false },
  both: { google: true, facebook: true, apple: false },
  'google-apple': { google: true, facebook: false, apple: true },
  all: { google: true, facebook: true, apple: true },
};

/** `--social-auth none | all | google,apple | google-facebook …` → providers (undefined: invalid). */
export function parseSocialAuth(value: string): SocialProviders | undefined {
  const legacy = LEGACY[value.trim()];
  if (legacy) return { ...legacy };
  const items = value.split(',').map(item => item.trim()).filter(Boolean);
  if (!items.length || items.some(item => !['google', 'facebook', 'apple'].includes(item))) return undefined;
  return { google: items.includes('google'), facebook: items.includes('facebook'), apple: items.includes('apple') };
}

export function hasSocialLogin(providers: SocialProviders): boolean {
  return providers.google || providers.facebook || providers.apple;
}

export function describeSocial(providers: SocialProviders): string {
  const names = [providers.google && 'Google', providers.facebook && 'Facebook', providers.apple && 'Apple'].filter(Boolean);
  return names.length ? names.join(' + ') : 'none';
}

/** Placeholders written for skipped providers. */
export const SOCIAL_PLACEHOLDERS = {
  googleWebClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
  googleIosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com',
  /** Reversed iOS client id – the URL scheme Google redirects back to on iOS. */
  googleIosUrlScheme: 'com.googleusercontent.apps.YOUR_GOOGLE_IOS_CLIENT_ID',
  facebookAppId: 'YOUR_FACEBOOK_APP_ID',
  facebookClientToken: 'YOUR_FACEBOOK_CLIENT_TOKEN',
} as const;

/** "123-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.123-abc". */
export function reversedGoogleClientId(clientId: string): string {
  return `com.googleusercontent.apps.${clientId.replace(/\.apps\.googleusercontent\.com$/, '')}`;
}

/** The values the generated project gets: the entered credentials, or the placeholders. */
export function socialValues(credentials: SocialCredentials = {}) {
  const googleIosClientId = credentials.googleIosClientId || SOCIAL_PLACEHOLDERS.googleIosClientId;
  return {
    googleWebClientId: credentials.googleWebClientId || SOCIAL_PLACEHOLDERS.googleWebClientId,
    googleIosClientId,
    googleIosUrlScheme: credentials.googleIosClientId ? reversedGoogleClientId(credentials.googleIosClientId) : SOCIAL_PLACEHOLDERS.googleIosUrlScheme,
    facebookAppId: credentials.facebookAppId || SOCIAL_PLACEHOLDERS.facebookAppId,
    facebookClientToken: credentials.facebookClientToken || SOCIAL_PLACEHOLDERS.facebookClientToken,
  };
}

/** Google client ids look like `<digits>-<hash>.apps.googleusercontent.com`. */
export function validateGoogleClientId(value: string, optional = false): true | string {
  const id = value.trim();
  if (!id) return optional ? true : 'Enter the client ID (or choose Skip).';
  return /^[\w-]+\.apps\.googleusercontent\.com$/.test(id) ? true : 'A Google client ID ends with .apps.googleusercontent.com';
}

export function validateFacebookAppId(value: string): true | string {
  return /^\d{5,20}$/.test(value.trim()) ? true : 'A Facebook App ID is a number (Meta for Developers → App settings → Basic).';
}
