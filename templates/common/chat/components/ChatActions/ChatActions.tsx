import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
{{#if VECTOR_ICONS}}
import { AppIcon, type AppIconName } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { AppText } from '{{IMPORT:components.AppText}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import { useChatActions, type ChatAction } from '../../hooks/useChatActions';

export interface ChatActionsProps {
  conversationId: string;
  /** Direct chats: also "Delete chat" (groups are left from Group info instead). */
  canDelete?: boolean;
  /** The chat was deleted – close the screen. */
  onDeleted?: () => void;
}

/** "Clear chat", "Clear all chats"{{#if GROUP_CHAT}} (Chat details and Group info){{/if}} – each one confirmed first. */
export function ChatActions({ conversationId, canDelete = false, onDeleted }: ChatActionsProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  const actions = useChatActions(conversationId, onDeleted);

  const row = (action: ChatAction, label: string, {{#if VECTOR_ICONS}}icon: AppIconName, {{/if}}onPress: () => void) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={actions.busy !== null} accessibilityRole="button" accessibilityLabel={label}>
{{#if VECTOR_ICONS}}
      <AppIcon name={icon} size={22} tintColor={styles.danger.color} />
{{/if}}
      <AppText fontFamily="medium" color="error" style={styles.label} text={label} />
      {actions.busy === action ? <ActivityIndicator /> : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.card}>
      {row('clear', translate('common', 'clearChat'), {{#if VECTOR_ICONS}}'broom', {{/if}}actions.clearChat)}
      <View style={styles.divider} />
      {row('clearAll', translate('common', 'clearAllChats'), {{#if VECTOR_ICONS}}'delete-sweep-outline', {{/if}}actions.clearAllChats)}
      {canDelete ? (
        <>
          <View style={styles.divider} />
          {row('delete', translate('common', 'deleteChat'), {{#if VECTOR_ICONS}}'delete-outline', {{/if}}actions.deleteChat)}
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
