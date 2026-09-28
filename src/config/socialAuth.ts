import type { SocialLoginOption } from '../core/types.js';

export interface SocialProviders {
  google: boolean;
  facebook: boolean;
  apple: boolean;
}

/** Prompt / --social-auth choices, in menu order. */
export const SOCIAL_LOGIN_CHOICES: Array<{ value: SocialLoginOption; label: string; description: string }> = [
  { value: 'none', label: 'None (No social login)', description: 'Email / mobile login only' },
  { value: 'google', label: 'Google Sign-In', description: '@react-native-google-signin/google-signin' },
  { value: 'facebook', label: 'Facebook Login', description: 'react-native-fbsdk-next' },
  { value: 'google-facebook', label: 'Google + Facebook', description: 'Both buttons on the login screen' },
  {
    value: 'google-apple',
    label: 'Google + Apple',
    description: 'Sign in with Apple is shown on iOS (App Store requires it next to other social logins)',
  },
  { value: 'all', label: 'Google + Apple + Facebook', description: 'All three providers' },
];

export const SOCIAL_LOGIN_IDS = SOCIAL_LOGIN_CHOICES.map(c => c.value);

export function socialProviders(option: SocialLoginOption): SocialProviders {
  return {
    google: option !== 'none' && option !== 'facebook',
    facebook: option === 'facebook' || option === 'google-facebook' || option === 'all',
    apple: option === 'google-apple' || option === 'all',
  };
}

/**
 * Placeholder credentials written into the generated project. Every one of them is
 * listed in the generated docs/SOCIAL_LOGIN.md so developers know what to replace.
 */
export const SOCIAL_PLACEHOLDERS = {
  googleWebClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
  googleIosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com',
  /** Reversed iOS client id – the URL scheme Google redirects back to on iOS. */
  googleIosUrlScheme: 'com.googleusercontent.apps.YOUR_GOOGLE_IOS_CLIENT_ID',
  facebookAppId: 'YOUR_FACEBOOK_APP_ID',
  facebookClientToken: 'YOUR_FACEBOOK_CLIENT_TOKEN',
} as const;
