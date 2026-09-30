import { I18nManager } from 'react-native';
import { isRTLLanguage } from './languages';

/**
 * The ONE place that decides the layout direction.
 *
 *   selected language ──► direction ('ltr' | 'rtl') ──► listeners (re-render) ──► whole UI
 *
 * Why not just I18nManager? React Native reads the native direction once, at startup, and
 * `I18nManager.getConstants()` keeps returning that value until the app is restarted – which is
 * why a switch back to English used to keep RTL back arrows until the app was reopened.
 * So the direction lives here, in JS, and changes the moment the language changes:
 * - AppProviders sets `direction` on the root view – Yoga mirrors every flex row, `start` /
 *   `end` margin, padding and position below it (and text alignment follows the layout).
 * - NavigationContainer gets it – native stack headers (back arrow, swipe-back), the drawer
 *   side and the tab bar follow.
 * - useDirection() re-renders its components: back / forward icons, `writingDirection`.
 * The native flags are still written (for the next cold start, the keyboard, system dialogs),
 * but nothing waits for them and the app never restarts.
 *
 * Rules for screens: styles use start / end (never left / right); icons that point "back" /
 * "forward" come from useDirection(); a Modal renders its own root, so its content uses
 * `useDirection().directionStyle`.
 */

export type LayoutDirection = 'ltr' | 'rtl';

export function directionFor(language: string | undefined): LayoutDirection {
  return isRTLLanguage(language) ? 'rtl' : 'ltr';
}

let direction: LayoutDirection = I18nManager.getConstants().isRTL ? 'rtl' : 'ltr';
const listeners = new Set<() => void>();

/** The direction the app is laid out in right now. */
export function currentDirection(): LayoutDirection {
  return direction;
}

/** Called on every direction change; returns the unsubscribe function (useSyncExternalStore). */
export function subscribeToDirection(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Chevrons / arrows that point "back" and "forward" in reading order. */
export function directionIcons(value: LayoutDirection = direction) {
  const rtl = value === 'rtl';
  return {
    backIcon: rtl ? 'chevron-right' : 'chevron-left',
    forwardIcon: rtl ? 'chevron-left' : 'chevron-right',
    backArrow: rtl ? 'arrow-right' : 'arrow-left',
  } as const;
}

/** Writes the native direction flags (persisted by React Native, read on the next start). */
function setNativeDirection(rtl: boolean): void {
  // allowRTL(false) keeps an LTR language left-to-right even on an Arabic / Hebrew device.
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  // `left` / `right` styles follow the direction too (React Native's default – set explicitly).
  I18nManager.swapLeftAndRightInRTL(true);
}

/**
 * Makes the app's direction match the language – immediately, without a restart. Called once
 * on startup (AppProviders, after the saved language is loaded) and after every language
 * change (useLanguage). The native flags are written every time, so the next cold start opens
 * in the right direction even if the app was killed right after a switch.
 */
export function applyLayoutDirection(language: string | undefined): void {
  const next = directionFor(language);
  setNativeDirection(next === 'rtl');
  if (next === direction) return;
  direction = next;
  listeners.forEach(listener => listener());
}
