import React, { useLayoutEffect } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
{{#if VECTOR_ICONS}}
import { AppIcon, type AppIconName } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { AppText } from '{{IMPORT:components.AppText}}';
import { useStyles, useTheme } from '{{IMPORT:hooks.useTheme}}';
import type { MainRouteProp, RootNavigation } from '{{IMPORT:navigation.types}}';
import { openNotification } from '{{IMPORT:notification.router}}';
import { getNotificationConfig, type AppNotification } from '{{IMPORT:notification.types}}';
import { useNotifications } from '{{IMPORT:notification.useNotifications}}';
import type { Theme } from '{{IMPORT:theme.index}}';

/** "just now", "5m", "3h", "2d", then the date. */
function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Every received notification (see notificationInbox.ts). Push taps land here for all
 * types except `chat`; tapping a row opens its content (routing: notificationTypes.ts).
 */
export function NotificationsScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<MainRouteProp<'Notifications'>>();
  const highlightId = route.params?.highlightId;
  const styles = useStyles(createStyles);
  const { theme } = useTheme();
  const { notifications, unreadCount, refreshing, refresh, markAllRead } = useNotifications();

  // "Read all" lives in the native header.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight:
        unreadCount > 0
          ? () => (
              <Pressable onPress={markAllRead} hitSlop={10} accessibilityRole="button">
                <AppText fontFamily="semiBold" color="primary" text="Read all" />
              </Pressable>
            )
          : undefined,
    });
  }, [navigation, unreadCount, markAllRead]);

  const renderItem = ({ item }: { item: AppNotification }) => {
    const config = getNotificationConfig(item.type);
    return (
      <Pressable
        onPress={() => openNotification(item)}
        style={({ pressed }) => [
          styles.row,
          !item.read && styles.rowUnread,
          item.id === highlightId && styles.rowHighlighted,
          pressed && styles.rowPressed,
        ]}>
        <View style={[styles.iconCircle, { backgroundColor: `${config.color}1A` }]}>
{{#if VECTOR_ICONS}}
          <AppIcon name={config.icon as AppIconName} size={22} tintColor={config.color} />
{{else}}
          <AppText fontSize="size18" text={config.emoji} />
{{/if}}
        </View>
        <View style={styles.rowText}>
          <View style={styles.rowHeader}>
            <AppText fontSize="size11" color="textSecondary" text={config.label.toUpperCase()} />
            <AppText fontSize="size11" color="textSecondary" text={timeAgo(item.receivedAt)} />
          </View>
          {item.title ? (
            <AppText fontFamily={item.read ? 'medium' : 'bold'} fontSize="size14" numberOfLines={1} text={item.title} />
          ) : null}
          {item.body ? <AppText fontSize="size13" color="textSecondary" numberOfLines={2} text={item.body} /> : null}
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </Pressable>
    );
  };

  return (
    <FlatList
      style={styles.list}
      data={notifications}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
      ListEmptyComponent={
        <View style={styles.empty}>
{{#if VECTOR_ICONS}}
          <AppIcon name="bell-sleep-outline" size={56} tintColor={theme.colors.textSecondary} />
{{else}}
          <AppText fontSize="size32" text="🔔" />
{{/if}}
          <AppText fontFamily="semiBold" fontSize="size16" text="No notifications yet" />
          <AppText fontSize="size13" color="textSecondary" align="center" text="Push notifications you receive will show up here." />
        </View>
      }
    />
  );
}

function Separator() {
  const styles = useStyles(createStyles);
  return <View style={styles.separator} />;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.spacing12,
      paddingHorizontal: theme.spacing.spacing16,
      paddingVertical: theme.spacing.spacing14,
      backgroundColor: theme.colors.background,
    },
    rowUnread: {
      backgroundColor: theme.colors.surface,
    },
    rowHighlighted: {
      backgroundColor: theme.colors.primarySoft,
    },
    rowPressed: {
      backgroundColor: theme.colors.pressed,
    },
    iconCircle: {
      width: theme.spacing.spacing40,
      height: theme.spacing.spacing40,
      borderRadius: theme.spacing.spacing20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
      gap: theme.spacing.spacing2,
    },
    rowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    unreadDot: {
      width: theme.spacing.spacing8,
      height: theme.spacing.spacing8,
      borderRadius: theme.spacing.spacing4,
      backgroundColor: theme.colors.primary,
      marginTop: theme.spacing.spacing6,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginStart: theme.spacing.spacing16 + theme.spacing.spacing40 + theme.spacing.spacing12,
    },
    emptyContainer: {
      flexGrow: 1,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.spacing8,
      padding: theme.spacing.spacing32,
    },
  });
