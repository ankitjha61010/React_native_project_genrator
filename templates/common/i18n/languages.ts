/**
 * Languages the app ships with. To add one:
 *   1. add it here (`rtl: true` for right-to-left scripts such as Arabic, Urdu or Hebrew),
 *   2. create `locales/<code>/` with the same JSON files as `locales/en/`,
 *   3. register the files in `resources.ts`.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', rtl: false },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', rtl: false },
{{#if RTL}}
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', rtl: true },
{{/if}}
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const FALLBACK_LANGUAGE: LanguageCode = 'en';

export const SUPPORTED_LANGUAGES: LanguageCode[] = LANGUAGES.map(language => language.code);

export function isSupportedLanguage(value: string | null | undefined): value is LanguageCode {
  return !!value && (SUPPORTED_LANGUAGES as string[]).includes(value);
}

/** True for right-to-left languages. */
export function isRTLLanguage(value: string | null | undefined): boolean {
  return LANGUAGES.some(language => language.code === value && language.rtl);
}
