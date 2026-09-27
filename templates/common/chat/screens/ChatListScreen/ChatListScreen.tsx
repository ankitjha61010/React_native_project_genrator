import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import { chatService } from '../../services/chatService';
import type { Conversation } from '{{IMPORT:chat.types}}';

export function ChatListScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const styles = useStyles(createStyles);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadChats = async () => {
    try {
      const data = await chatService.fetchConversations();
      setConversations(data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  const renderItem = ({ item }: { item: Conversation }) => {
    const lastMsg = item.lastMessage;
    const timeFormatted = lastMsg
      ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <TouchableOpacity
        style={styles.chatRow}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('ChatRoom', {
            conversationId: item.id,
            title: item.title,
            avatar: item.avatar,
            isOnline: item.participants.some(p => p.isOnline),
            isGroup: item.isGroup,
          })
        }>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: item.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }}
            style={styles.avatar}
          />
          {item.participants.some(p => p.isOnline) && <View style={styles.onlineBadge} />}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <View style={styles.topRow}>
            <AppText fontFamily="semiBold" fontSize="size16" numberOfLines={1} style={styles.title}>
              {item.title}
            </AppText>
            <AppText fontSize="size12" color="textSecondary">
              {timeFormatted}
            </AppText>
          </View>

          <View style={styles.bottomRow}>
            <AppText fontSize="size14" color="textSecondary" numberOfLines={1} style={styles.lastMessage}>
              {lastMsg?.type === 'image' && '📷 Photo'}
              {lastMsg?.type === 'video' && '🎥 Video'}
              {lastMsg?.type === 'audio' && '🎙️ Voice note'}
              {lastMsg?.type === 'document' && '📄 Document'}
              {lastMsg?.type === 'text' && lastMsg.text}
              {!lastMsg && 'Start chatting…'}
            </AppText>

            {Boolean(item.unreadCount && item.unreadCount > 0) && (
              <View style={styles.unreadBadge}>
                <AppText style={styles.unreadText}>{item.unreadCount}</AppText>
              </View>
            )}
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
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadChats(); }} />
        }
        contentContainerStyle={conversations.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyView}>
{{#if VECTOR_ICONS}}
              <AppIcon name="chat-outline" size={56} tintColor="#AAAAAA" />
{{/if}}
              <AppText color="textSecondary" style={styles.emptyText}>No conversations yet</AppText>
            </View>
          ) : undefined
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
    chatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
    },
    avatarContainer: {
      position: 'relative',
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
    },
    onlineBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#4CAF50',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    infoContainer: {
      flex: 1,
      marginLeft: 14,
      gap: 4,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      flex: 1,
      marginRight: 8,
    },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    lastMessage: {
      flex: 1,
      marginRight: 8,
    },
    unreadBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    unreadText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: 'bold',
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginLeft: 82,
    },
    emptyContainer: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    emptyView: {
      alignItems: 'center',
      gap: 12,
      padding: 24,
    },
    emptyText: {
      fontSize: 15,
    },
  });
