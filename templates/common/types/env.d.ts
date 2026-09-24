/** Variables exposed from `.env` by react-native-dotenv. Keep in sync with `.env.example`. */
declare module '@env' {
  export const API_BASE_URL: string | undefined;
  export const APP_ENV: string | undefined;
{{#if API_ENCRYPTION}}
  export const API_ENCRYPTION_ENABLED: string | undefined;
  export const API_ENCRYPTION_KEY: string | undefined;
  export const API_ENCRYPTION_IV: string | undefined;
{{/if}}
}
