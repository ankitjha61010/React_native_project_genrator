import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if TERMS}}
{{#if VECTOR_ICONS}}
import { useLegalPages, type LegalPage } from '{{IMPORT:components.LegalLinks}}';
{{else}}
import { useLegalPages } from '{{IMPORT:components.LegalLinks}}';
{{/if}}
{{/if}}
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import { useStyles, useTheme } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
{{#if NOTIFICATIONS}}
import { useNotifications } from '{{IMPORT:notification.useNotifications}}';
{{/if}}
import type { Theme } from '{{IMPORT:theme.index}}';
import { resetToAuth } from './navigationRef';

{{#if VECTOR_ICONS}}
{{#if NOTIFICATIONS}}
function NotificationsIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="bell-outline" size={size} tintColor={color} />;
}
{{/if}}

function SettingsIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="cog-outline" size={size} tintColor={color} />;
}
{{#if TERMS}}

function TermsIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="file-document-outline" size={size} tintColor={color} />;
}

function PrivacyIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="shield-lock-outline" size={size} tintColor={color} />;
}

const LEGAL_ICONS: Record<LegalPage, typeof TermsIcon> = { terms: TermsIcon, privacy: PrivacyIcon };
{{/if}}

function LogoutIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="logout" size={size} tintColor={color} />;
}
{{/if}}

/**
 * Drawer body:
 *   header (signed-in user)
 *   ─ the drawer screens and shortcuts (scrolls when they don't fit)
 *   ─ Log out – always at the bottom, above the home indicator, on every screen size.
 */
export function DrawerContent(props: DrawerContentComponentProps): React.JSX.Element {
  const { navigation } = props;
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthSession();
{{#if TERMS}}
  const legal = useLegalPages();
{{/if}}
{{#if NOTIFICATIONS}}
  const { unreadCount } = useNotifications();
{{/if}}

  /** Screens of the parent (Main) stack are pushed above the drawer. */
  const open = (screen: 'Settings'{{#if NOTIFICATIONS}} | 'Notifications'{{/if}}) => {
    navigation.closeDrawer();
    navigation.navigate(screen);
  };

  const logout = async () => {
    navigation.closeDrawer();
    await signOut();
    resetToAuth();
  };

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll}>
        <View style={styles.profile}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <AppText fontFamily="bold" fontSize="size20" color="onPrimary" text={(user?.name ?? 'U').charAt(0).toUpperCase()} />
            </View>
          )}
          <AppText fontFamily="semiBold" fontSize="size16" numberOfLines={1} text={user?.name ?? ''} />
          {user?.email ? <AppText fontSize="size12" color="textSecondary" numberOfLines={1} text={user.email} /> : null}
        </View>

        <DrawerItemList {...props} />

{{#if NOTIFICATIONS}}
        <DrawerItem
          label={unreadCount > 0 ? `${translate('common', 'notifications')} (${unreadCount})` : translate('common', 'notifications')}
          onPress={() => open('Notifications')}
          inactiveTintColor={theme.colors.text}
{{#if VECTOR_ICONS}}
          icon={NotificationsIcon}
{{/if}}
        />
{{/if}}
        <DrawerItem
          label={translate('common', 'settings')}
          onPress={() => open('Settings')}
          inactiveTintColor={theme.colors.text}
{{#if VECTOR_ICONS}}
          icon={SettingsIcon}
{{/if}}
        />
{{#if TERMS}}

        <View style={styles.divider} />

        {/* Terms & Conditions / Privacy Policy – the links come from the backend (GET /legal). */}
        {legal.pages.map(({ page, title, open: openPage }) => (
          <DrawerItem
            key={page}
            label={title}
            onPress={() => {
              navigation.closeDrawer();
              openPage();
            }}
            inactiveTintColor={theme.colors.text}
{{#if VECTOR_ICONS}}
            icon={LEGAL_ICONS[page]}
{{/if}}
          />
        ))}
{{/if}}
      </DrawerContentScrollView>

      {/* Outside the scroll view, so it stays at the bottom however many items there are. */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, theme.spacing.spacing12) }]}>
        <DrawerItem
          label={translate('common', 'logout')}
          onPress={logout}
          inactiveTintColor={theme.colors.error}
{{#if VECTOR_ICONS}}
          icon={LogoutIcon}
{{/if}}
        />
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scroll: {
      flexGrow: 1,
    },
    profile: {
      paddingHorizontal: theme.spacing.spacing20,
      paddingTop: theme.spacing.spacing24,
      paddingBottom: theme.spacing.spacing16,
      gap: theme.spacing.spacing4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      marginBottom: theme.spacing.spacing8,
    },
    avatar: {
      width: theme.spacing.spacing56,
      height: theme.spacing.spacing56,
      borderRadius: theme.spacing.spacing28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      marginBottom: theme.spacing.spacing8,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.spacing8,
      marginHorizontal: theme.spacing.spacing20,
    },
    footer: {
      paddingTop: theme.spacing.spacing4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
  });
