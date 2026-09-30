import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { applyLayoutDirection, FALLBACK_LANGUAGE, isSupportedLanguage, LANGUAGES, type LanguageCode } from '@infrastructure/i18n';
import { StorageKeys } from '@data/storage/storageKeys';
import { storageService } from '@data/storage/storageService';

/** Current language + a setter that persists the choice (see i18n/languageDetector.ts). */
export function useLanguage() {
  const { i18n } = useTranslation();
  const language: LanguageCode = isSupportedLanguage(i18n.language) ? i18n.language : FALLBACK_LANGUAGE;

  const changeLanguage = useCallback(
    async (code: LanguageCode) => {
      await i18n.changeLanguage(code);
      // Saved, then the layout direction follows at once (no restart).
      await storageService.set(StorageKeys.LANGUAGE, code);
      applyLayoutDirection(code);
    },
    [i18n],
  );

  return { language, languages: LANGUAGES, changeLanguage };
}
