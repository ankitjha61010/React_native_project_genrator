import React, { useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import type { RootNavigation } from '{{IMPORT:navigation.types}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { Conversation } from '{{IMPORT:chat.types}}';
import { useChatList } from '../../hooks/useChatList';
import { messagePreview } from '../../utils/chatFormat';

/**
 * Header button → New chat. A real component: its hooks run in its own render, because it is
 * rendered as an element (renderNewChatButton) – never passed as `headerRight: NewChatButton`,
 * which React Navigation would call as a plain function ("Invalid hook call").
 */
function NewChatButton(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const styles = useStyles(createStyles);
  return (
    <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'NewChat' })} hitSlop={10} accessibilityRole="button" accessibilityLabel={translate('common', 'newChat')} style={styles.newChat}>
{{#if VECTOR_ICONS}}
      <AppIcon name="square-edit-outline" size={24} tintColor={styles.accent.color} />
{{else}}
      <AppText color="primary" text="✎" />
{{/if}}
    </TouchableOpacity>
  );
}

const renderNewChatButton = () => <NewChatButton />;

function Separator(): React.JSX.Element {
  const styles = useStyles(createStyles);
  return <View style={styles.separator} />;
}

/** The conversation list. UI only – data and live updates come from useChatList. */
export function ChatListScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const styles = useStyles(createStyles);
  const { user } = useAuthSession();
  const { conversations, loading, refreshing, refresh, remove } = useChatList();
  /** Search: chat name, people in it and the last message – over the loaded chats. */
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const shown = useMemo(
    () =>
      query
        ? conversations.filter(
            c =>
              c.title.toLowerCase().includes(query) ||
              c.participants.some(p => p.name?.toLowerCase().includes(query)) ||
              messagePreview(c.lastMessage, user?.id).toLowerCase().includes(query),
          )
        : conversations,
    [conversations, query, user?.id],
  );

  // Before the first paint, so the button never pops in.
  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: renderNewChatButton });
  }, [navigation]);

  /** Long press: delete the chat – for you only (like WhatsApp){{#if GROUP_CHAT}}; a group is left{{/if}}. */
  const confirmDelete = (conversation: Conversation) =>
    Alert.alert({{#if GROUP_CHAT}}translate('common', conversation.isGroup ? 'leaveGroup' : 'deleteChat'){{else}}translate('common', 'deleteChat'){{/if}}, {{#if GROUP_CHAT}}translate('common', conversation.isGroup ? 'leaveGroupConfirm' : 'deleteChatConfirm'){{else}}translate('common', 'deleteChatConfirm'){{/if}}, [
      { text: translate('common', 'cancel'), style: 'cancel' },
      { text: {{#if GROUP_CHAT}}translate('common', conversation.isGroup ? 'leaveGroup' : 'delete'){{else}}translate('common', 'delete'){{/if}}, style: 'destructive', onPress: () => remove(conversation.id) },
    ]);

  const renderItem = ({ item }: { item: Conversation }) => {
    const time = item.lastMessage ? new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const online = {{#if GROUP_CHAT}}!item.isGroup && {{/if}}item.participants.some(p => p.isOnline);
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onLongPress={() => confirmDelete(item)}
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
            <AppText fontSize="size14" color="textSecondary" numberOfLines={1} style={styles.grow} text={messagePreview(item.lastMessage, user?.id)} />
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
      {conversations.length > 0 || search ? (
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={translate('common', 'searchChats')}
          placeholderTextColor={styles.placeholder.color}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          accessibilityLabel={translate('common', 'searchChats')}
          style={styles.search}
        />
      ) : null}
      <FlatList
        data={shown}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={shown.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator />
          ) : query ? (
            <View style={styles.empty}>
              <AppText color="textSecondary" intlType="common" value="noChatsFound" />
            </View>
          ) : (
            <View style={styles.empty}>
{{#if VECTOR_ICONS}}
              <AppIcon name="chat-outline" size={56} tintColor={styles.muted.color} />
{{/if}}
              <AppText color="textSecondary" intlType="common" value="noConversations" />
              <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'NewChat' })} accessibilityRole="button">
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
    search: {
      marginHorizontal: theme.spacing.spacing16,
      marginVertical: theme.spacing.spacing8,
      paddingHorizontal: theme.spacing.spacing12,
      minHeight: theme.spacing.spacing40,
      borderRadius: theme.borderRadius.radius8,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.size14,
    },
    placeholder: {
      color: theme.colors.placeholder,
    },
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
