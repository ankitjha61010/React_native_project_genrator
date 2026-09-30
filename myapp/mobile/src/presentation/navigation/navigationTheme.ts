import { useMemo } from 'react';
import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { useTheme } from '@presentation/hooks/useTheme';

/**
 * React Navigation theme built from the app theme, so headers, the tab bar and screen
 * backgrounds follow light / dark mode. Passed to `NavigationContainer` in AppNavigator.
 */
export function useNavigationTheme(): NavigationTheme {
  const { theme, isDark } = useTheme();

  return useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    const { fontFamily } = theme.typography;
    // Weight is part of the font family (GolosText-Medium, -Bold…), so fontWeight stays normal.
    const font = (family: string) => ({ fontFamily: family, fontWeight: 'normal' as const });
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.error,
      },
      fonts: {
        regular: font(fontFamily.regular),
        medium: font(fontFamily.medium),
        bold: font(fontFamily.semiBold),
        heavy: font(fontFamily.bold),
      },
    };
  }, [theme, isDark]);
}
