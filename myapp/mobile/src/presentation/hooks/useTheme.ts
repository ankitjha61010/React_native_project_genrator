import { useMemo } from 'react';
import type { ColorScheme, Theme } from '@presentation/theme';
import { useTheme } from '@presentation/app/ThemeContext';

/** Current theme + `setThemeMode('light' | 'dark' | 'system')`, `toggleTheme()`. */
export { useTheme };

/** Any colour of the theme, e.g. `primary`, `text`, `surface`. */
export type ColorName = keyof ColorScheme;

/**
 * Themed styles, recomputed only when the theme changes:
 *
 *   const createStyles = (theme: Theme) => StyleSheet.create({ title: { color: theme.colors.primary } });
 *   const styles = useStyles(createStyles);
 */
export function useStyles<T>(createStyles: (theme: Theme) => T): T {
  const { theme } = useTheme();
  return useMemo(() => createStyles(theme), [createStyles, theme]);
}
