import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
{{#if DRAWER}}
import { DrawerActions, useNavigation } from '@react-navigation/native';
{{else}}
import { useNavigation } from '@react-navigation/native';
{{/if}}
{{#if VECTOR_ICONS}}
import { AppIcon, type AppIconName } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { useStyles, useTheme } from '{{IMPORT:hooks.useTheme}}';
{{else}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
{{/if}}
{{#if NOTIFICATIONS}}
import { useNotifications } from '{{IMPORT:notification.useNotifications}}';
{{/if}}
import type { Theme } from '{{IMPORT:theme.index}}';
{{#if NOTIFICATIONS}}
import type { RootNavigation } from './navigationTypes';
{{/if}}

interface HeaderIconButtonProps {
{{#if VECTOR_ICONS}}
  icon: AppIconName;
{{/if}}
{{#if VECTOR_ICONS}}
  /** Shown when the app has no icon font (unused while vector icons are enabled). */
  fallback?: string;
{{else}}
  /** Emoji / glyph shown in place of an icon. */
  fallback: string;
{{/if}}
  accessibilityLabel: string;
  onPress: () => void;
  /** Small counter on the icon (hidden when 0). */
  badge?: number;
}

/**
 * An icon button for the NATIVE stack header (`headerLeft` / `headerRight`) – the
 * header itself is drawn by react-native-screens, this is only its button.
 */
export function HeaderIconButton({
{{#if VECTOR_ICONS}}
  icon,
{{else}}
  fallback,
{{/if}}
  accessibilityLabel,
  onPress,
  badge = 0,
}: HeaderIconButtonProps): React.JSX.Element {
{{#if VECTOR_ICONS}}
  const { theme } = useTheme();
{{/if}}
  const styles = useStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
{{#if VECTOR_ICONS}}
      <AppIcon name={icon} size={24} tintColor={theme.colors.text} />
{{else}}
      <AppText fontSize="size20" text={fallback} />
{{/if}}
      {badge > 0 && (
        <View style={styles.badge}>
          <AppText fontFamily="semiBold" fontSize="size10" color="onPrimary" text={badge > 99 ? '99+' : String(badge)} />
        </View>
      )}
    </Pressable>
  );
}

{{#if DRAWER}}
/** Opens the side drawer (works from any screen inside it). */
export function DrawerMenuButton(): React.JSX.Element {
  const navigation = useNavigation();
  return (
    <HeaderIconButton
{{#if VECTOR_ICONS}}
      icon="menu"
{{/if}}
      fallback="☰"
      accessibilityLabel="Open menu"
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
    />
  );
}

/**
 * For `headerLeft`. React Navigation calls header options as plain functions, so a component
 * with hooks must be rendered as an element – never passed as `headerLeft: DrawerMenuButton`.
 */
export const renderDrawerButton = () => <DrawerMenuButton />;
{{/if}}

{{#if NOTIFICATIONS}}
/** Bell with the unread count; opens the Notifications screen. */
export function NotificationBellButton(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const { unreadCount } = useNotifications();
  return (
    <HeaderIconButton
{{#if VECTOR_ICONS}}
      icon={unreadCount > 0 ? 'bell-badge-outline' : 'bell-outline'}
{{/if}}
      fallback="🔔"
      accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      badge={unreadCount}
      onPress={() => navigation.navigate('Main', { screen: 'Notifications' })}
    />
  );
}

/** For `headerRight` (rendered as an element – see renderDrawerButton). */
export const renderNotificationBell = () => <NotificationBellButton />;
{{/if}}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      padding: theme.spacing.spacing4,
    },
    pressed: {
      opacity: 0.5,
    },
    badge: {
      position: 'absolute',
      top: 0,
      end: -2,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 3,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.error,
    },
  });
