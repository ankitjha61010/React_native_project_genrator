import { currentDirection, directionIcons, type LayoutDirection } from '{{IMPORT:i18n.index}}';

/**
 * Layout direction of the running app (decided in `i18n/direction.ts` – it only changes with
 * a restart, so this never re-renders).
 *
 *   const { isRTL, backIcon, forwardIcon } = useDirection();
 *   <AppIcon name={forwardIcon} />
 *
 * Layout mirrors automatically, as long as styles use start / end instead of left / right:
 * `marginStart`, `paddingEnd`, `start: 0`, `borderTopStartRadius`…
 */
export function useDirection(): { direction: LayoutDirection; isRTL: boolean } & ReturnType<typeof directionIcons> {
  const direction = currentDirection();
  return { direction, isRTL: direction === 'rtl', ...directionIcons() };
}
