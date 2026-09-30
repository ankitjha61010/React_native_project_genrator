import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppIcon, type AppIconName } from '@presentation/components/AppIcon';
import { AppText } from '@presentation/components/AppText';
import { useStyles } from '@presentation/hooks/useTheme';
import { translate } from '@infrastructure/i18n';
import type { Theme } from '@presentation/theme';
import { useChatActions, type ChatAction } from '../../hooks/useChatActions';

export interface ChatActionsProps {
  conversationId: string;
  /** Direct chats: also "Delete chat" (groups are left from Group info instead). */
  canDelete?: boolean;
  /** The chat was deleted – close the screen. */
  onDeleted?: () => void;
}

/** "Clear chat", "Clear all chats" (Chat details and Group info) – each one confirmed first. */
export function ChatActions({ conversationId, canDelete = false, onDeleted }: ChatActionsProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  const actions = useChatActions(conversationId, onDeleted);

  const row = (action: ChatAction, label: string, icon: AppIconName, onPress: () => void) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={actions.busy !== null} accessibilityRole="button" accessibilityLabel={label}>
      <AppIcon name={icon} size={22} tintColor={styles.danger.color} />
      <AppText fontFamily="medium" color="error" style={styles.label} text={label} />
      {actions.busy === action ? <ActivityIndicator /> : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.card}>
      {row('clear', translate('common', 'clearChat'), 'broom', actions.clearChat)}
      <View style={styles.divider} />
      {row('clearAll', translate('common', 'clearAllChats'), 'delete-sweep-outline', actions.clearAllChats)}
      {canDelete ? (
        <>
          <View style={styles.divider} />
          {row('delete', translate('common', 'deleteChat'), 'delete-outline', actions.deleteChat)}
        </>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing12,
      minHeight: theme.spacing.spacing48,
      paddingHorizontal: theme.spacing.spacing16,
    },
    label: {
      flex: 1,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginStart: theme.spacing.spacing16,
    },
    danger: {
      color: theme.colors.error,
    },
  });
