import type { LanguageDetectorAsyncModule } from 'i18next';
import { getLocales } from 'react-native-localize';
import { StorageKeys } from '{{IMPORT:storage.keys}}';
import { storageService } from '{{IMPORT:storage.service}}';
import { FALLBACK_LANGUAGE, isSupportedLanguage } from './languages';

/** Picks the saved language, then the device language, then the fallback. */
export const languageDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  init: () => {},
  detect: (callback: (lng: string) => void) => {
    storageService
      .get<string>(StorageKeys.LANGUAGE)
      .then(saved => {
        if (isSupportedLanguage(saved)) {
          callback(saved);
          return;
        }
        const deviceLanguage = getLocales()[0]?.languageCode;
        callback(isSupportedLanguage(deviceLanguage) ? deviceLanguage : FALLBACK_LANGUAGE);
      })
      .catch(() => {
        callback(FALLBACK_LANGUAGE);
      });
  },
  cacheUserLanguage: async language => {
    try {
      await storageService.set(StorageKeys.LANGUAGE, language);
    } catch {
      // Ignore cache failure
    }
  },
};
