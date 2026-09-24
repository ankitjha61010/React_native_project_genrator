import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
{{#if RTL}}
import { applyLayoutDirection, FALLBACK_LANGUAGE, isSupportedLanguage, LANGUAGES, type LanguageCode } from '{{IMPORT:i18n.index}}';
import { StorageKeys } from '{{IMPORT:storage.keys}}';
import { storageService } from '{{IMPORT:storage.service}}';
{{else}}
import { FALLBACK_LANGUAGE, isSupportedLanguage, LANGUAGES, type LanguageCode } from '{{IMPORT:i18n.index}}';
{{/if}}

/** Current language + a setter that persists the choice (see i18n/languageDetector.ts). */
export function useLanguage() {
  const { i18n } = useTranslation();
  const language: LanguageCode = isSupportedLanguage(i18n.language) ? i18n.language : FALLBACK_LANGUAGE;

  const changeLanguage = useCallback(
    async (code: LanguageCode) => {
      await i18n.changeLanguage(code);
{{#if RTL}}
      // Saved before anything else: switching between LTR and RTL restarts the app.
      await storageService.set(StorageKeys.LANGUAGE, code);
      applyLayoutDirection(code);
{{/if}}
    },
    [i18n],
  );

  return { language, languages: LANGUAGES, changeLanguage };
}
