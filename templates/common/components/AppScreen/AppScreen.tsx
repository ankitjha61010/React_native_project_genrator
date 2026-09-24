import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { AppLoader } from '{{IMPORT:components.AppLoader}}';
import { useStyles, useTheme, type ColorName } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';

export interface AppScreenProps {
  children: React.ReactNode;
  /** Rendered above the content, outside the scroll view (e.g. <AppHeader />). */
  header?: React.ReactNode;
  /** Wrap content in a ScrollView. Default: true. */
  scroll?: boolean;
  /** Horizontal/vertical padding for the content. Default: true. */
  padded?: boolean;
  /** Shows a loading overlay on top of the content. */
  loading?: boolean;
  background?: ColorName;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}

/** Screen layout: safe areas, status bar, keyboard avoidance and optional scrolling. */
export function AppScreen({
  children,
  header,
  scroll = true,
  padded = true,
  loading = false,
  background = 'background',
  edges = ['top', 'bottom'],
  contentStyle,
}: AppScreenProps): React.JSX.Element {
  const { theme, isDark } = useTheme();
  const styles = useStyles(createStyles);
  const content = [padded && styles.padded, contentStyle];

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: theme.colors[background] }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {header}
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.root}
            contentContainerStyle={[styles.scrollContent, content]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.root, content]}>{children}</View>
        )}
      </KeyboardAvoidingView>
      {loading ? <AppLoader overlay /> : null}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: theme.flexs.flexFull,
    },
    scrollContent: {
      flexGrow: theme.flexs.flexFull,
    },
    padded: {
      paddingHorizontal: theme.spacing.spacing24,
      paddingVertical: theme.spacing.spacing16,
    },
  });
