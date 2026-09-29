import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { ChatMediaPreview } from '../../components/ChatMediaPreview/ChatMediaPreview';
import { TypingIndicator } from '../../components/TypingIndicator/TypingIndicator';
import { useChatRoom } from '../../hooks/useChatRoom';

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
  // Newest first for the inverted list (it starts at the bottom, older messages load on scroll up).
  const data = useMemo(() => [...room.messages].reverse(), [room.messages]);

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
          disabled={!isGroup}
          onPress={() => navigation.navigate('GroupInfo', { conversationId })}
{{else}}
          disabled
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
          inverted
          data={data}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ChatBubble message={item} onPressMedia={setPreviewMedia} onRetry={room.retry}{{#if GROUP_CHAT}} showSender={isGroup}{{/if}} />}
          contentContainerStyle={styles.listContent}
          onEndReached={room.loadOlder}
          onEndReachedThreshold={0.3}
          ListFooterComponent={room.loadingOlder ? <ActivityIndicator style={styles.older} /> : undefined}
          keyboardShouldPersistTaps="handled"
        />

        {/* "Jane is typing…" sits right above the input – never in the header. */}
        <TypingIndicator typing={room.typing} />

        <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
          <ChatInputBar onSend={draft => room.send(draft)} onTyping={room.notifyTyping} />
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
