import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useStyles, useTheme, type ColorName } from '@presentation/hooks/useTheme';
import type { Theme } from '@presentation/theme';

export interface AppLoaderProps {
  size?: 'small' | 'large';
  color?: ColorName;
  /** Covers the parent with a translucent overlay. */
  overlay?: boolean;
  /** Takes the whole available space and centres the spinner. */
  fullScreen?: boolean;
}

export function AppLoader({
  size = 'large',
  color = 'primary',
  overlay = false,
  fullScreen = false,
}: AppLoaderProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  return (
    <View
      style={[styles.base, fullScreen && styles.fullScreen, overlay && styles.overlay]}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}>
      <ActivityIndicator size={size} color={theme.colors[color]} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      padding: theme.spacing.spacing12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullScreen: {
      flex: theme.flexs.flexFull,
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.overlay,
      zIndex: 10,
    },
  });
