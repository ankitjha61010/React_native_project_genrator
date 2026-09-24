import { useMemo } from 'react';
import type { ColorScheme, Theme } from '{{IMPORT:theme.index}}';
{{#if THEME_CONTEXT}}
import { useTheme } from '{{IMPORT:app.themeContext}}';

/** Current theme + `setThemeMode('light' | 'dark' | 'system')`, `toggleTheme()`. */
export { useTheme };
{{else}}
import { lightTheme } from '{{IMPORT:theme.index}}';

const STATIC_THEME = { theme: lightTheme, isDark: false } as const;

/**
 * The app theme. This project was generated without a ThemeContext, so it is always
 * `lightTheme` – components still read it through this hook, so adding dark mode later
 * only means replacing this function.
 */
export function useTheme(): { theme: Theme; isDark: boolean } {
  return STATIC_THEME;
}
{{/if}}

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
