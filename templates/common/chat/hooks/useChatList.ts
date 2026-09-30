import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { errorMessage } from '{{IMPORT:api.errors}}';
import type { Conversation } from '{{IMPORT:chat.types}}';
import { SOCKET_EVENTS } from '{{IMPORT:socket.events}}';
import { socketService } from '{{IMPORT:socket.service}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { chatService } from '../services/chatService';

/** The conversation list: refreshed when shown and on every new message; presence is live. */
export function useChatList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setConversations(await chatService.fetchConversations());
    } catch {
      // Keep the current list (offline); pull to refresh retries.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  // Fresh unread counts whenever the list is shown again (e.g. back from a chat).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const setOnline = (userId: string, isOnline: boolean, lastSeen?: string) =>
      setConversations(current =>
        current.map(c => ({ ...c, participants: c.participants.map(p => (p.id === userId ? { ...p, isOnline, lastSeen: lastSeen ?? p.lastSeen } : p)) })),
      );
    const subscriptions = [
      // A new message anywhere: its conversation moves to the top with the new unread count.
      socketService.on(SOCKET_EVENTS.RECEIVE_MESSAGE, load),
      socketService.onReconnect(load),
      // Cleared on another device: previews / unread counts change.
      socketService.on(SOCKET_EVENTS.CONVERSATION_CLEARED, load),
      socketService.on<{ userId: string }>(SOCKET_EVENTS.USER_ONLINE, event => setOnline(event.userId, true)),
      socketService.on<{ userId: string; lastSeen?: string }>(SOCKET_EVENTS.USER_OFFLINE, event => setOnline(event.userId, false, event.lastSeen)),
{{#if GROUP_CHAT}}
      socketService.on(SOCKET_EVENTS.CONVERSATION_UPDATED, load),
      socketService.on(SOCKET_EVENTS.CONVERSATION_REMOVED, load),
{{/if}}
    ];
    return () => subscriptions.forEach(off => off());
  }, [load]);

  /** "Delete chat" (for you only{{#if GROUP_CHAT}}; leaves a group{{/if}}) – gone from the list at once. */
  const remove = useCallback(
    async (conversationId: string) => {
      setConversations(current => current.filter(c => c.id !== conversationId));
      try {
        await chatService.deleteConversation(conversationId);
      } catch (error) {
        flash.error({ message: errorMessage(error) });
        load();
      }
    },
    [load],
  );

  return { conversations, loading, refreshing, refresh, remove };
}
