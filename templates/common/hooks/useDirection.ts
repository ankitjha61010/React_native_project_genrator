import { I18nManager } from 'react-native';
import type { LayoutDirection } from '{{IMPORT:i18n.index}}';

/**
 * Layout direction of the running app (see `i18n/direction.ts`).
 *
 *   const { isRTL } = useDirection();
 *   <AppIcon name={isRTL ? 'chevron-left' : 'chevron-right'} />
 *
 * Layout mirrors automatically, as long as styles use start/end instead of left/right:
 * `marginStart`, `paddingEnd`, `start: 0`…
 */
export function useDirection(): { direction: LayoutDirection; isRTL: boolean } {
  const isRTL = I18nManager.isRTL;
  return { direction: isRTL ? 'rtl' : 'ltr', isRTL };
}
