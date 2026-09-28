import React from 'react';
import { StyleSheet, View } from 'react-native';
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
{{#if VECTOR_ICONS}}
import { useLegalPages, type LegalPage } from '{{IMPORT:components.LegalLinks}}';
{{else}}
import { useLegalPages } from '{{IMPORT:components.LegalLinks}}';
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

function TermsIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="file-document-outline" size={size} tintColor={color} />;
}

function PrivacyIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="shield-lock-outline" size={size} tintColor={color} />;
}

const LEGAL_ICONS: Record<LegalPage, typeof TermsIcon> = { terms: TermsIcon, privacy: PrivacyIcon };

function LogoutIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="logout" size={size} tintColor={color} />;
}
{{/if}}

/** Drawer body: signed-in user, the drawer screens, then shortcuts to stack screens. */
export function DrawerContent(props: DrawerContentComponentProps): React.JSX.Element {
  const { navigation } = props;
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const { user, signOut } = useAuthSession();
  const legal = useLegalPages();
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
    <DrawerContentScrollView {...props}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <AppText fontFamily="bold" fontSize="size20" color="onPrimary" text={(user?.name ?? 'U').charAt(0).toUpperCase()} />
        </View>
        <AppText fontFamily="semiBold" fontSize="size16" numberOfLines={1} text={user?.name ?? 'Guest'} />
        {user?.email ? <AppText fontSize="size12" color="textSecondary" numberOfLines={1} text={user.email} /> : null}
      </View>

      <DrawerItemList {...props} />

{{#if NOTIFICATIONS}}
      <DrawerItem
        label={unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications'}
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

      <View style={styles.divider} />

      {/* Terms & Conditions / Privacy Policy (URLs in .env) */}
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

      <View style={styles.divider} />

      <DrawerItem
        label={translate('common', 'logout')}
        onPress={logout}
        inactiveTintColor={theme.colors.error}
{{#if VECTOR_ICONS}}
        icon={LogoutIcon}
{{/if}}
      />
    </DrawerContentScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
  });
