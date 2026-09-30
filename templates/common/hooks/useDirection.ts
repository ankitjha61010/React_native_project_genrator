import { useSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';
import { currentDirection, directionIcons, subscribeToDirection, type LayoutDirection } from '{{IMPORT:i18n.index}}';

const directionStyles = StyleSheet.create({
  ltr: { direction: 'ltr' },
  rtl: { direction: 'rtl' },
});

/**
 * Layout direction of the running app (decided in `i18n/direction.ts`). Re-renders the
 * component the moment the language switches between LTR and RTL – no restart.
 *
 *   const { isRTL, backIcon, forwardIcon } = useDirection();
 *   <AppIcon name={forwardIcon} />
 *
 * Layout mirrors automatically, as long as styles use start / end instead of left / right:
 * `marginStart`, `paddingEnd`, `start: 0`, `borderTopStartRadius`… `directionStyle` is for
 * views that start a new root – the content of a <Modal>.
 */
export function useDirection(): { direction: LayoutDirection; isRTL: boolean; directionStyle: (typeof directionStyles)[LayoutDirection] } & ReturnType<typeof directionIcons> {
  const direction = useSyncExternalStore(subscribeToDirection, currentDirection);
  return { direction, isRTL: direction === 'rtl', directionStyle: directionStyles[direction], ...directionIcons(direction) };
}
