import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { UserSummary } from '{{IMPORT:api.user}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { AppText } from '{{IMPORT:components.AppText}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import { UserRow } from '../../components/UserRow/UserRow';
import { useBlockedUsers } from '../../hooks/useBlockedUsers';

function Separator(): React.JSX.Element {
  const styles = useStyles(createStyles);
  return <View style={styles.separator} />;
}

/** Profile → Blocked users: everyone you blocked, each with an Unblock button. UI only – data comes from useBlockedUsers. */
export function BlockedUsersScreen(): React.JSX.Element {
  const styles = useStyles(createStyles);
  const { users, loading, refreshing, error, refresh, retry, unblock, unblockingId } = useBlockedUsers();

  const renderItem = ({ item }: { item: UserSummary }) => {
    const name = item.name || translate('common', 'unknownUser');
    return (
      <UserRow
        name={name}
        avatar={item.avatar}
        trailing={
          unblockingId === item.id ? (
            <ActivityIndicator />
          ) : (
            <TouchableOpacity
              style={styles.unblock}
              onPress={() => unblock(item.id)}
              disabled={unblockingId !== null}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${translate('common', 'unblock')} ${name}`}>
              <AppText fontSize="size13" fontFamily="semiBold" color="primary" intlType="common" value="unblock" />
            </TouchableOpacity>
          )
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={users.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator />
          ) : (
            <View style={styles.empty}>
{{#if VECTOR_ICONS}}
              <AppIcon name={error ? 'alert-circle-outline' : 'account-cancel-outline'} size={56} tintColor={styles.muted.color} />
{{/if}}
              <AppText color="textSecondary" align="center" text={error ?? translate('common', 'noBlockedUsers')} />
              {error ? (
                <TouchableOpacity onPress={retry} accessibilityRole="button">
                  <AppText color="primary" fontFamily="semiBold" intlType="common" value="retry" />
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    muted: {
      color: theme.colors.textSecondary,
    },
    unblock: {
      paddingHorizontal: theme.spacing.spacing12,
      paddingVertical: theme.spacing.spacing6,
      borderRadius: theme.borderRadius.radius8,
      borderWidth: theme.spacing.spacing1,
      borderColor: theme.colors.primary,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginStart: 72,
    },
    emptyContainer: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    empty: {
      alignItems: 'center',
      gap: theme.spacing.spacing12,
      padding: theme.spacing.spacing24,
    },
  });
