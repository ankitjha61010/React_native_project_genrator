import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { AppIcon, type AppIconName } from '@presentation/components/AppIcon';
import { AppText } from '@presentation/components/AppText';
import { useStyles, useTheme } from '@presentation/hooks/useTheme';
import { useNotifications } from '@infrastructure/notification/useNotifications';
import type { Theme } from '@presentation/theme';
import type { RootNavigation } from './navigationTypes';

interface HeaderIconButtonProps {
  icon: AppIconName;
  /** Shown when the app has no icon font (unused while vector icons are enabled). */
  fallback?: string;
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
  icon,
  accessibilityLabel,
  onPress,
  badge = 0,
}: HeaderIconButtonProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <AppIcon name={icon} size={24} tintColor={theme.colors.text} />
      {badge > 0 && (
        <View style={styles.badge}>
          <AppText fontFamily="semiBold" fontSize="size10" color="onPrimary" text={badge > 99 ? '99+' : String(badge)} />
        </View>
      )}
    </Pressable>
  );
}

/** Opens the side drawer (works from any screen inside it). */
export function DrawerMenuButton(): React.JSX.Element {
  const navigation = useNavigation();
  return (
    <HeaderIconButton
      icon="menu"
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

/** Bell with the unread count; opens the Notifications screen. */
export function NotificationBellButton(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const { unreadCount } = useNotifications();
  return (
    <HeaderIconButton
      icon={unreadCount > 0 ? 'bell-badge-outline' : 'bell-outline'}
      fallback="🔔"
      accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      badge={unreadCount}
      onPress={() => navigation.navigate('Main', { screen: 'Notifications' })}
    />
  );
}

/** For `headerRight` (rendered as an element – see renderDrawerButton). */
export const renderNotificationBell = () => <NotificationBellButton />;

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
