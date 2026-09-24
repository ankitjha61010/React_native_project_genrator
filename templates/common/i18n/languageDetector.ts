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
  detect: async () => {
    const saved = await storageService.get<string>(StorageKeys.LANGUAGE);
    if (isSupportedLanguage(saved)) {
      return saved;
    }
    const deviceLanguage = getLocales()[0]?.languageCode;
    return isSupportedLanguage(deviceLanguage) ? deviceLanguage : FALLBACK_LANGUAGE;
  },
  cacheUserLanguage: async language => {
    await storageService.set(StorageKeys.LANGUAGE, language);
  },
};
