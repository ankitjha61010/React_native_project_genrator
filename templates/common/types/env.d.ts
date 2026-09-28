/** Variables exposed from `.env` by react-native-dotenv. Keep in sync with `.env.example`. */
declare module '@env' {
  export const API_BASE_URL: string | undefined;
  export const SOCKET_URL: string | undefined;
  export const APP_ENV: string | undefined;
  export const TERMS_URL: string | undefined;
  export const PRIVACY_POLICY_URL: string | undefined;
{{#if API_ENCRYPTION}}
  export const API_ENCRYPTION_ENABLED: string | undefined;
  export const API_ENCRYPTION_KEY: string | undefined;
  export const API_ENCRYPTION_IV: string | undefined;
{{/if}}
{{#if SOCIAL_GOOGLE}}
  export const GOOGLE_WEB_CLIENT_ID: string | undefined;
  export const GOOGLE_IOS_CLIENT_ID: string | undefined;
{{/if}}
}
