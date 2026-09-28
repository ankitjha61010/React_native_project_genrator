import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  I18nManager,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLoader } from '{{IMPORT:components.AppLoader}}';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { userMessage } from '{{IMPORT:api.errors}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
{{#if SOCKET}}
import { socketService } from '{{IMPORT:socket.service}}';
import { SOCKET_EVENTS } from '{{IMPORT:socket.events}}';
{{/if}}
import { ChatBubble } from '../../components/ChatBubble/ChatBubble';
import { ChatInputBar } from '../../components/ChatInputBar/ChatInputBar';
import { ChatMediaPreview } from '../../components/ChatMediaPreview/ChatMediaPreview';
import { chatService } from '../../services/chatService';
import type { ChatMessage, Conversation } from '{{IMPORT:chat.types}}';

export function ChatRoomScreen(): React.JSX.Element {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const styles = useStyles(createStyles);

  const conversationId: string = route.params?.conversationId;
  const { user } = useAuthSession();
  const myId = user?.id;
  const initialTitle = route.params?.title ?? 'Chat';
  const initialAvatar = route.params?.avatar;
  const initialIsOnline = route.params?.isOnline;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewMedia, setPreviewMedia] = useState<ChatMessage | null>(null);
  const [typingName, setTypingName] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const title = conversation?.title ?? initialTitle;
  const avatar = conversation?.avatar ?? initialAvatar;
  const isOnline =
    conversation?.participants?.some(p => p.isOnline) ?? (initialIsOnline || false);

  /** Adds or replaces a message (the same id never appears twice). */
  const upsert = useCallback(
    (message: ChatMessage, replaceId?: string) =>
      setMessages(prev => {
        const next = { ...message, isMe: message.senderId === myId };
        const without = prev.filter(m => m.id !== next.id && m.id !== replaceId);
        return [...without, next].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      }),
    [myId],
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initChat = async () => {
      try {
        const [details, page] = await Promise.all([chatService.fetchConversation(conversationId), chatService.fetchMessages(conversationId)]);
        setConversation(details);
        setMessages(page.items);
        await chatService.markRead(conversationId);
      } catch (error) {
        flash.error({ message: userMessage(error) ?? 'Could not load the conversation.' });
      } finally {
        setLoading(false);
      }
    };

    initChat();

{{#if SOCKET}}
    // The room is for typing indicators; messages reach every member anyway.
    socketService.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: conversationId });
    const subscriptions = [
      socketService.on<ChatMessage>(SOCKET_EVENTS.RECEIVE_MESSAGE, message => {
        if (message.conversationId !== conversationId) return;
        upsert(message);
        if (message.senderId !== myId) chatService.markRead(conversationId).catch(() => undefined);
      }),
      // The others read the conversation: my messages get blue ticks.
      socketService.on<{ conversationId: string }>(SOCKET_EVENTS.MESSAGE_READ, event => {
        if (event.conversationId === conversationId) setMessages(prev => prev.map(m => (m.isMe ? { ...m, status: 'read' } : m)));
      }),
      socketService.on<{ conversationId: string; messageId: string }>(SOCKET_EVENTS.MESSAGE_DELETE, event => {
        if (event.conversationId === conversationId) setMessages(prev => prev.filter(m => m.id !== event.messageId));
      }),
      socketService.on<{ roomId: string; name: string }>(SOCKET_EVENTS.USER_TYPING, event => {
        if (event.roomId === conversationId) setTypingName(event.name);
      }),
      socketService.on<{ roomId: string }>(SOCKET_EVENTS.USER_STOP_TYPING, event => {
        if (event.roomId === conversationId) setTypingName(null);
      }),
    ];
    unsubscribe = () => subscriptions.forEach(off => off());
{{/if}}

    return () => {
{{#if SOCKET}}
      socketService.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId: conversationId });
      unsubscribe?.();
{{/if}}
    };
  }, [conversationId, myId, upsert]);
{{#if SOCKET}}

  // Typing indicator: "typing" at most every 3 s, "stop" after 4 s without keystrokes.
  const typingState = useRef<{ lastSent: number; timer?: ReturnType<typeof setTimeout> }>({ lastSent: 0 });
  const handleTyping = useCallback(() => {
    const state = typingState.current;
    if (Date.now() - state.lastSent > 3000) {
      socketService.emit(SOCKET_EVENTS.USER_TYPING, { roomId: conversationId });
      state.lastSent = Date.now();
    }
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      socketService.emit(SOCKET_EVENTS.USER_STOP_TYPING, { roomId: conversationId });
      state.lastSent = 0;
    }, 4000);
  }, [conversationId]);
{{/if}}

  const handleSendMessage = async (msgData: Partial<ChatMessage>) => {
    // Show it right away ("sending"); the server's copy replaces it.
    const localId = `local-${Date.now()}`;
    const pending: ChatMessage = {
      id: localId,
      conversationId,
      senderId: myId ?? '',
      senderName: user?.name ?? '',
      type: msgData.type ?? 'text',
      ...msgData,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    upsert(pending);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      // The server delivers it to the other members over Socket.IO.
      const sent = await chatService.sendMessage(conversationId, msgData);
      upsert(sent, localId);
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== localId));
      flash.error({ message: userMessage(error) ?? 'The message could not be sent.' });
    }
  };

  if (loading) {
    return <AppLoader fullScreen />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Custom Header with Profile & Online/Offline Status */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
{{#if VECTOR_ICONS}}
          {/* chevron flips direction in RTL so it always points "back" */}
          <AppIcon
            name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'}
            size={28}
            tintColor={styles.backIconColor.color}
          />
{{else}}
          <AppText style={{ fontSize: 20 }}>{I18nManager.isRTL ? '›' : '‹'}</AppText>
{{/if}}
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileSection} activeOpacity={0.8}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
            <View
              style={[
                styles.statusIndicator,
                isOnline ? styles.statusOnline : styles.statusOffline,
              ]}
            />
          </View>

          <View style={styles.headerInfo}>
            <AppText style={styles.headerTitle} numberOfLines={1}>
              {title}
            </AppText>
            <AppText
              style={[
                styles.headerSubtitle,
                isOnline ? styles.statusOnlineText : styles.statusOfflineText,
              ]}>
              {typingName ? 'typing…' : isOnline ? 'Online' : 'Offline'}
            </AppText>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChatBubble message={item} onPressMedia={msg => setPreviewMedia(msg)} />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: 16 }]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
{{#if SOCKET}}
          <ChatInputBar onSendMessage={handleSendMessage} onTyping={handleTyping} />
{{else}}
          <ChatInputBar onSendMessage={handleSendMessage} />
{{/if}}
        </View>

        <ChatMediaPreview
          visible={Boolean(previewMedia)}
          message={previewMedia}
          onClose={() => setPreviewMedia(null)}
        />
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
      paddingHorizontal: 8,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    backBtn: {
      padding: 4,
      marginEnd: 4,  // RTL-aware: flips automatically
    },
    backIconColor: {
      color: theme.colors.text,
    },
    profileSection: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarWrapper: {
      position: 'relative',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    statusIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 11,
      height: 11,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    statusOnline: {
      backgroundColor: '#4CAF50',
    },
    statusOffline: {
      backgroundColor: '#9E9E9E',
    },
    headerInfo: {
      marginStart: 10,  // RTL-aware: becomes marginRight in RTL
      flex: 1,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      fontWeight: '400',
    },
    statusOnlineText: {
      color: '#4CAF50',
    },
    statusOfflineText: {
      color: theme.colors.textSecondary,
    },
    chatArea: {
      flex: 1,
    },
    listContent: {
      paddingVertical: 12,
    },
  });
