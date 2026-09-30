import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLoader } from '{{IMPORT:components.AppLoader}}';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
{{#if RTL}}
{{#if VECTOR_ICONS}}
import { useDirection } from '{{IMPORT:hooks.useDirection}}';
{{/if}}
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import type { MainStackParamList } from '{{IMPORT:navigation.types}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { ChatMessage, ChatParticipant } from '{{IMPORT:chat.types}}';
import { ChatBubble } from '../../components/ChatBubble/ChatBubble';
import { ChatInputBar } from '../../components/ChatInputBar/ChatInputBar';
import { ChatNotice } from '../../components/ChatNotice/ChatNotice';
import { ChatMediaPreview } from '../../components/ChatMediaPreview/ChatMediaPreview';
import { TypingIndicator } from '../../components/TypingIndicator/TypingIndicator';
import { useChatRoom } from '../../hooks/useChatRoom';
import { withDateSeparators, type ChatListItem } from '../../utils/chatFormat';

/** How long the original of a reply stays tinted after jumping to it. */
const HIGHLIGHT_MS = 1500;

/** "Online" / "last seen 14:05" / "last seen 12 Mar". */
function presenceText(participant: ChatParticipant | undefined): string {
  if (!participant) return '';
  if (participant.isOnline) return translate('common', 'online');
  if (!participant.lastSeen) return translate('common', 'offline');
  const seen = new Date(participant.lastSeen);
  const today = seen.toDateString() === new Date().toDateString();
  const when = today ? seen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : seen.toLocaleDateString([], { day: 'numeric', month: 'short' });
  return translate('common', 'lastSeen', { value1: when });
}

/** One conversation. UI only – messages, typing and presence come from useChatRoom. */
export function ChatRoomScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<MainStackParamList, 'ChatRoom'>>();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const styles = useStyles(createStyles);
{{#if RTL}}
{{#if VECTOR_ICONS}}
  const { backIcon } = useDirection();
{{/if}}
{{/if}}
  const { conversationId } = route.params;
  const room = useChatRoom(conversationId);
  const [previewMedia, setPreviewMedia] = useState<ChatMessage | null>(null);
  /** The message the next one replies to (shown above the input). */
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatListItem>>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(highlightTimer.current), []);
{{#if GROUP_CHAT}}
  const isGroup = room.conversation?.isGroup ?? route.params.isGroup ?? false;

  // Removed from the group / left it on another device.
  useEffect(() => {
    if (room.removed) navigation.goBack();
  }, [room.removed, navigation]);
{{/if}}

  const title = room.conversation?.title ?? route.params.title ?? '';
  const avatar = room.conversation?.avatar ?? route.params.avatar;
{{#if GROUP_CHAT}}
  const subtitle = isGroup ? translate('common', 'membersCount', { value1: (room.conversation?.participants.length ?? 0) + 1 }) : presenceText(room.other);
{{else}}
  const subtitle = presenceText(room.other);
{{/if}}
  // Newest first for the inverted list (it starts at the bottom, older messages load on scroll up),
  // with "Today" / "Yesterday" / "28 September 2026" above each day's messages.
  const data = useMemo(() => withDateSeparators([...room.messages].reverse()), [room.messages]);

  /** Tap on a reply's quote: scroll to the original and tint it for a moment. */
  const showOriginal = useCallback(
    (messageId: string) => {
      const index = data.findIndex(item => item.kind === 'message' && item.message.id === messageId);
      // Not loaded yet (older page) or cleared – nothing to jump to.
      if (index < 0) return;
      listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
      setHighlightedId(messageId);
      clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
    },
    [data],
  );

  /** Long press on a message: reply, or delete your own (for everyone). */
  const showActions = useCallback(
    (message: ChatMessage) => {
      const deleteIt = () =>
        Alert.alert(translate('common', 'deleteMessage'), translate('common', 'deleteMessageConfirm'), [
          { text: translate('common', 'cancel'), style: 'cancel' },
          { text: translate('common', 'delete'), style: 'destructive', onPress: () => room.deleteMessage(message.id) },
        ]);
      Alert.alert(translate('common', 'message'), undefined, [
        ...(message.status !== 'failed' ? [{ text: translate('common', 'reply'), onPress: () => setReplyingTo(message) }] : []),
        ...(message.isMe && message.status !== 'failed' ? [{ text: translate('common', 'delete'), style: 'destructive' as const, onPress: deleteIt }] : []),
        { text: translate('common', 'cancel'), style: 'cancel' },
      ]);
    },
    [room],
  );

  const renderItem = ({ item }: { item: ChatListItem }) =>
    item.kind === 'date' ? (
      <ChatNotice text={item.label} />
    ) : (
      <ChatBubble
        message={item.message}
        myId={room.myId}
        onPressMedia={setPreviewMedia}
        onRetry={room.retry}
        onLongPress={showActions}
        onPressReply={showOriginal}
        highlighted={item.message.id === highlightedId}{{#if GROUP_CHAT}}
        showSender={isGroup}{{/if}}
      />
    );

  if (room.loading && !room.conversation) {
    return <AppLoader fullScreen />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10} accessibilityRole="button" accessibilityLabel={translate('common', 'back')}>
{{#if VECTOR_ICONS}}
          <AppIcon name={ {{#if RTL}}backIcon{{else}}'chevron-left'{{/if}} } size={28} tintColor={styles.icon.color} />
{{else}}
          <AppText fontSize="size20" text="‹" />
{{/if}}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profile}
          activeOpacity={0.8}
{{#if GROUP_CHAT}}
          accessibilityRole="button"
          accessibilityLabel={translate('common', isGroup ? 'groupInfo' : 'chatDetails')}
          // Photo or name → the chat's details (a group's: members, admins, name).
          onPress={() => (isGroup ? navigation.navigate('GroupInfo', { conversationId }) : navigation.navigate('ChatDetails', { conversationId }))}
{{else}}
          accessibilityRole="button"
          accessibilityLabel={translate('common', 'chatDetails')}
          // Photo or name → the chat's details.
          onPress={() => navigation.navigate('ChatDetails', { conversationId })}
{{/if}}>
          <View>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.initials]}>
                <AppText fontFamily="semiBold" color="onPrimary" text={title.charAt(0).toUpperCase()} />
              </View>
            )}
            {room.other?.isOnline ? <View style={styles.onlineDot} /> : null}
          </View>
          <View style={styles.headerText}>
            <AppText fontFamily="semiBold" fontSize="size16" numberOfLines={1} text={title} />
            {subtitle ? <AppText fontSize="size12" color={room.other?.isOnline ? 'success' : 'textSecondary'} numberOfLines={1} text={subtitle} /> : null}
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.chatArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          inverted
          data={data}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          onScrollToIndexFailed={({ index, averageItemLength }) => listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: true })}
          contentContainerStyle={styles.listContent}
          onEndReached={room.loadOlder}
          onEndReachedThreshold={0.3}
          ListFooterComponent={room.loadingOlder ? <ActivityIndicator style={styles.older} /> : undefined}
          keyboardShouldPersistTaps="handled"
        />

        {/* "Jane is typing…" sits right above the input – never in the header. */}
        <TypingIndicator typing={room.typing} />

        <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
          <ChatInputBar
            replyTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            onSend={draft => {
              room.send(replyingTo ? { ...draft, replyToId: replyingTo.id } : draft);
              setReplyingTo(null);
            }}
            onTyping={room.notifyTyping}
          />
        </View>

        <ChatMediaPreview visible={Boolean(previewMedia)} message={previewMedia} onClose={() => setPreviewMedia(null)} />
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.spacing8,
      paddingVertical: theme.spacing.spacing10,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    backBtn: {
      padding: theme.spacing.spacing4,
      marginEnd: theme.spacing.spacing4,
    },
    icon: {
      color: theme.colors.text,
    },
    profile: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
    },
    initials: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    onlineDot: {
      position: 'absolute',
      bottom: 0,
      end: 0,
      width: 11,
      height: 11,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.surface,
      backgroundColor: theme.colors.success,
    },
    headerText: {
      flex: 1,
      marginStart: theme.spacing.spacing10,
    },
    chatArea: {
      flex: 1,
    },
    listContent: {
      paddingVertical: theme.spacing.spacing12,
    },
    older: {
      marginVertical: theme.spacing.spacing12,
    },
  });
