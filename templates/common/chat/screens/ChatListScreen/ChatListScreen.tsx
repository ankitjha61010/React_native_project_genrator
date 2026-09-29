import React, { useCallback, useLayoutEffect } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import type { RootNavigation } from '{{IMPORT:navigation.types}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { ChatMessage, Conversation } from '{{IMPORT:chat.types}}';
import { useChatList } from '../../hooks/useChatList';

/** "Photo", "Voice message"… for the last-message line. */
function preview(message: ChatMessage | undefined): string {
  if (!message) return translate('common', 'startChat');
  switch (message.type) {
    case 'image':
      return `📷 ${translate('common', 'photo')}`;
    case 'video':
      return `🎥 ${translate('common', 'video')}`;
    case 'audio':
      return `🎙️ ${translate('common', 'voiceMessage')}`;
    case 'document':
      return `📄 ${message.fileName ?? translate('common', 'document')}`;
    default:
      return message.text ?? '';
  }
}

interface NewChatButtonProps {
  onPress: () => void;
  color: string;
  style: StyleProp<ViewStyle>;
}

/**
 * Header button → New chat. No hooks in here: the screen passes everything in, and renders it
 * as an element from `headerRight` (React Navigation calls `headerRight` as a plain function).
 */
function NewChatButton({ onPress, color, style }: NewChatButtonProps): React.JSX.Element {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={translate('common', 'newChat')} style={style}>
{{#if VECTOR_ICONS}}
      <AppIcon name="square-edit-outline" size={24} tintColor={color} />
{{else}}
      <AppText color="primary" text="✎" />
{{/if}}
    </TouchableOpacity>
  );
}

function Separator(): React.JSX.Element {
  const styles = useStyles(createStyles);
  return <View style={styles.separator} />;
}

/** The conversation list. UI only – data and live updates come from useChatList. */
export function ChatListScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const styles = useStyles(createStyles);
  const { conversations, loading, refreshing, refresh } = useChatList();

  const openNewChat = useCallback(() => navigation.navigate('Main', { screen: 'NewChat' }), [navigation]);

  // Before the first paint, so the button never pops in.
  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: () => <NewChatButton onPress={openNewChat} color={styles.accent.color} style={styles.newChat} /> });
  }, [navigation, openNewChat, styles]);

  const renderItem = ({ item }: { item: Conversation }) => {
    const time = item.lastMessage ? new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const online = {{#if GROUP_CHAT}}!item.isGroup && {{/if}}item.participants.some(p => p.isOnline);
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Main', { screen: 'ChatRoom', params: { conversationId: item.id, title: item.title, avatar: item.avatar{{#if GROUP_CHAT}}, isGroup: item.isGroup{{/if}} } })}>
        <View>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.initials]}>
              <AppText fontFamily="semiBold" fontSize="size18" color="onPrimary" text={item.title.charAt(0).toUpperCase()} />
            </View>
          )}
          {online ? <View style={styles.onlineBadge} /> : null}
        </View>

        <View style={styles.info}>
          <View style={styles.line}>
            <AppText fontFamily="semiBold" fontSize="size16" numberOfLines={1} style={styles.grow} text={item.title} />
            <AppText fontSize="size12" color="textSecondary" text={time} />
          </View>
          <View style={styles.line}>
            <AppText fontSize="size14" color="textSecondary" numberOfLines={1} style={styles.grow} text={preview(item.lastMessage)} />
            {item.unreadCount ? (
              <View style={styles.unread}>
                <AppText fontSize="size10" fontFamily="bold" color="onPrimary" text={String(item.unreadCount)} />
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={conversations.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator />
          ) : (
            <View style={styles.empty}>
{{#if VECTOR_ICONS}}
              <AppIcon name="chat-outline" size={56} tintColor={styles.muted.color} />
{{/if}}
              <AppText color="textSecondary" intlType="common" value="noConversations" />
              <TouchableOpacity onPress={openNewChat} accessibilityRole="button">
                <AppText color="primary" fontFamily="semiBold" intlType="common" value="startChat" />
              </TouchableOpacity>
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
    newChat: {
      paddingHorizontal: theme.spacing.spacing16,
    },
    accent: {
      color: theme.colors.primary,
    },
    muted: {
      color: theme.colors.textSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing14,
      paddingHorizontal: theme.spacing.spacing16,
      paddingVertical: theme.spacing.spacing12,
      backgroundColor: theme.colors.surface,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.colors.primary,
    },
    initials: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    onlineBadge: {
      position: 'absolute',
      bottom: 2,
      end: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.success,
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    info: {
      flex: 1,
      gap: theme.spacing.spacing4,
    },
    line: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing8,
    },
    grow: {
      flex: 1,
    },
    unread: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginStart: 82,
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
