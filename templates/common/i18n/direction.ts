import { I18nManager } from 'react-native';
import RNRestart from 'react-native-restart';
import { isRTLLanguage } from './languages';

export type LayoutDirection = 'ltr' | 'rtl';

export function directionFor(language: string | undefined): LayoutDirection {
  return isRTLLanguage(language) ? 'rtl' : 'ltr';
}

/**
 * RTL is applied natively: React Native reads the layout direction (`I18nManager`) once, at
 * startup, and mirrors everything from it – flex rows, text alignment, stack headers, the tab
 * bar and swipe-back gestures. So when the new language has a different direction, the
 * direction is persisted with `forceRTL` and the app restarts once.
 *
 * Called after i18n is initialised and after every language change (`useLanguage`).
 */
export function applyLayoutDirection(language: string | undefined): void {
  const rtl = isRTLLanguage(language);
  if (I18nManager.isRTL === rtl) {
    return;
  }
  // allowRTL(false) keeps an English UI left-to-right even on an Arabic device.
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  RNRestart.restart();
}
