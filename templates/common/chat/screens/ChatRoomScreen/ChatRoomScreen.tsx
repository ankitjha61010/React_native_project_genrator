import React, { useEffect, useState, useRef } from 'react';
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
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';
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

  const conversationId = route.params?.conversationId ?? 'conv_1';
  const initialTitle = route.params?.title ?? 'Chat';
  const initialAvatar = route.params?.avatar;
  const initialIsOnline = route.params?.isOnline;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewMedia, setPreviewMedia] = useState<ChatMessage | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const title = conversation?.title ?? initialTitle;
  const avatar =
    conversation?.avatar ??
    initialAvatar ??
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
  const isOnline =
    conversation?.participants?.some(p => p.isOnline) ?? (initialIsOnline || false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initChat = async () => {
      try {
        const [allConvs, msgs] = await Promise.all([
          chatService.fetchConversations(),
          chatService.fetchMessages(conversationId),
        ]);
        const found = allConvs.find(c => c.id === conversationId);
        if (found) setConversation(found);
        setMessages(msgs);
      } finally {
        setLoading(false);
      }
    };

    initChat();

{{#if SOCKET}}
    // Connect and listen for real-time messages via socket
    socketService.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: conversationId });

    unsubscribe = socketService.on(SOCKET_EVENTS.RECEIVE_MESSAGE, (newMsg: ChatMessage) => {
      if (newMsg.conversationId === conversationId) {
        setMessages(prev => [...prev, newMsg]);
      }
    });
{{/if}}

    return () => {
{{#if SOCKET}}
      socketService.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId: conversationId });
      unsubscribe?.();
{{/if}}
    };
  }, [conversationId]);

  const handleSendMessage = async (msgData: Partial<ChatMessage>) => {
    const sentMsg = await chatService.sendMessage(conversationId, msgData);
    setMessages(prev => [...prev, sentMsg]);

{{#if SOCKET}}
    // Broadcast via socket
    socketService.emit(SOCKET_EVENTS.SEND_MESSAGE, sentMsg);
{{/if}}

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
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
              {isOnline ? 'Online' : 'Offline'}
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
          <ChatInputBar onSendMessage={handleSendMessage} />
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
