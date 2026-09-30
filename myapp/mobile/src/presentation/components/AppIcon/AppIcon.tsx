import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons/static';
import { useTheme, type ColorName } from '@presentation/hooks/useTheme';

/** Any Material Design icon name – https://pictogrammers.com/library/mdi/ */
export type AppIconName = React.ComponentProps<typeof MaterialDesignIcons>['name'];

const ICON_SIZE = { sm: 16, md: 24, lg: 32 } as const;

export interface AppIconProps {
  name: AppIconName;
  size?: keyof typeof ICON_SIZE | number;
  color?: ColorName;
  /** Raw colour, e.g. the `color` React Navigation passes to tab bar icons. */
  tintColor?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

/**
 * Central icon abstraction – the only file importing an icon library, so switching
 * icon sets later means changing this file only.
 *
 * The font is registered natively: `MaterialDesignIcons.ttf` in Info.plist › UIAppFonts
 * (iOS) and bundled by the package's Gradle setup (Android).
 */
export function AppIcon({
  name,
  size = 'md',
  color = 'text',
  tintColor,
  style,
  accessibilityLabel,
}: AppIconProps): React.JSX.Element {
  const { theme } = useTheme();
  const pixelSize = typeof size === 'number' ? size : ICON_SIZE[size];
  return (
    <MaterialDesignIcons
      name={name}
      size={pixelSize}
      color={tintColor ?? theme.colors[color]}
      style={style}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
