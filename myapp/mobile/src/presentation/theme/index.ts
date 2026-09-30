import { lightColors, darkColors, ColorScheme } from './colors';
import { typography, Typography } from './typography';
import {
  spacing,
  borderRadius,
  shadows,
  Spacing,
  BorderRadius,
  Shadows,
  flexs,
  Flex,
  Opacity,
  opacity,
} from './spacing';

export interface Theme {
  colors: ColorScheme;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
  isDark: boolean;
  flexs: Flex;
  opacity: Opacity;
}

export const lightTheme: Theme = {
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  isDark: false,
  flexs,
  opacity,
};

export const darkTheme: Theme = {
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  isDark: true,
  flexs,
  opacity,
};

export type ThemeMode = 'light' | 'dark' | 'system';

export * from './colors';
export * from './typography';
export * from './spacing';
