import { I18nManager } from 'react-native';
import RNRestart from 'react-native-restart';
import { isRTLLanguage } from './languages';

/**
 * The ONE place that decides the layout direction.
 *
 *   selected language (saved) ──► direction ('ltr' | 'rtl') ──► I18nManager (native) ──► whole UI
 *
 * React Native reads the native direction once, at startup, and mirrors everything from it –
 * flex rows, `start` / `end` styles, text alignment, stack headers, the drawer, the tab bar and
 * swipe-back gestures. The app never flips things by hand: styles use start / end (not left /
 * right), icons that point "back" / "forward" come from `directionIcons()` (or useDirection()).
 */

export type LayoutDirection = 'ltr' | 'rtl';

export function directionFor(language: string | undefined): LayoutDirection {
  return isRTLLanguage(language) ? 'rtl' : 'ltr';
}

/** The direction the app is laid out in right now. */
export function currentDirection(): LayoutDirection {
  return I18nManager.getConstants().isRTL ? 'rtl' : 'ltr';
}

/** Chevrons / arrows that point "back" and "forward" in reading order. */
export function directionIcons() {
  const rtl = currentDirection() === 'rtl';
  return {
    backIcon: rtl ? 'chevron-right' : 'chevron-left',
    forwardIcon: rtl ? 'chevron-left' : 'chevron-right',
    backArrow: rtl ? 'arrow-right' : 'arrow-left',
  } as const;
}

/** Writes the native direction flags (they are persisted by React Native). */
function setNativeDirection(rtl: boolean): void {
  // allowRTL(false) keeps an LTR language left-to-right even on an Arabic / Hebrew device.
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  // `left` / `right` styles follow the direction too (React Native's default – set explicitly).
  I18nManager.swapLeftAndRightInRTL(true);
}

/**
 * Makes the native direction match the language. Called once on startup (AppProviders, after
 * the saved language is loaded) and after every language change (useLanguage).
 *
 * - Same direction: the flags are written again anyway, so a half-finished switch (e.g. the app
 *   was killed during the restart) can never leave LTR / RTL mixed after the next start.
 * - Other direction: the flags are written and the app restarts once. The short delay lets
 *   Android persist the flags before the process is replaced.
 */
export function applyLayoutDirection(language: string | undefined): void {
  const rtl = isRTLLanguage(language);
  setNativeDirection(rtl);
  if (I18nManager.getConstants().isRTL !== rtl) {
    setTimeout(() => RNRestart.restart(), 300);
  }
}
