import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { errorMessage } from '{{IMPORT:api.errors}}';
import type { ChatMessage, Conversation, TypingUser } from '{{IMPORT:chat.types}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import { SOCKET_EVENTS } from '{{IMPORT:socket.events}}';
import { socketService } from '{{IMPORT:socket.service}}';
import { translate } from '{{IMPORT:i18n.index}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { chatService, normalizeMessage, type MessageDraft } from '../services/chatService';

/** Typing indicators disappear on their own if the "stop typing" event gets lost. */
const TYPING_TIMEOUT_MS = 6000;
/** "typing" is sent at most every 3 s; "stop typing" after 4 s without keystrokes. */
const TYPING_THROTTLE_MS = 3000;
const TYPING_IDLE_MS = 4000;

const byDate = (a: ChatMessage, b: ChatMessage) => a.createdAt.localeCompare(b.createdAt);

/**
 * Everything the chat room shows, kept live over Socket.IO: messages (send with upload, read
 * receipts, delete), who is typing, online / last seen{{#if GROUP_CHAT}}, group changes{{/if}}. After a reconnect
 * (network drop, app back in the foreground) it reloads what it may have missed – no polling.
 */
export function useChatRoom(conversationId: string) {
  const { user } = useAuthSession();
  const myId = user?.id;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typing, setTyping] = useState<TypingUser[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
{{#if GROUP_CHAT}}
  /** You left / were removed – the screen closes. */
  const [removed, setRemoved] = useState(false);
{{/if}}
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  /** Adds or replaces a message (the same id never appears twice). */
  const upsert = useCallback(
    (message: ChatMessage, replaceId?: string) =>
      setMessages(previous => {
        const next = { ...message, isMe: message.senderId === myId };
        return [...previous.filter(m => m.id !== next.id && m.id !== replaceId), next].sort(byDate);
      }),
    [myId],
  );

  const stopTypingOf = useCallback((userId: string) => {
    clearTimeout(typingTimers.current.get(userId));
    typingTimers.current.delete(userId);
    setTyping(previous => previous.filter(t => t.userId !== userId));
  }, []);

  /** Conversation + the latest messages (on open and after every reconnect). */
  const load = useCallback(async () => {
    try {
      const [details, page, blocked] = await Promise.all([
        chatService.fetchConversation(conversationId),
        chatService.fetchMessages(conversationId),
        chatService.fetchBlockedUsers().catch(() => [] as string[]),
      ]);
      setConversation(details);
      setBlockedUserIds(blocked);
      // Keep messages that are still sending.
      setMessages(previous => [
        ...page.items.map(m => ({ ...m, isMe: m.senderId === myId })),
        ...previous.filter(m => m.status === 'sending' || m.status === 'failed'),
      ].sort(byDate));
      setHasMore(page.hasMore);
      await chatService.markRead(conversationId);
    } catch (error) {
      flash.error({ message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [conversationId, myId]);

  useEffect(() => {
    load();
    // The room is for typing indicators; messages reach every member anyway.
    const joinRoom = () => socketService.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: conversationId });
    joinRoom();

    const timers = typingTimers.current;
    const subscriptions = [
      socketService.onReconnect(() => {
        joinRoom();
        load();
      }),
      socketService.on<ChatMessage>(SOCKET_EVENTS.RECEIVE_MESSAGE, message => {
        if (message.conversationId !== conversationId) return;
        upsert(normalizeMessage(message));
        stopTypingOf(message.senderId);
        if (message.senderId !== myId) chatService.markRead(conversationId).catch(() => undefined);
      }),
      // The others read the conversation: my messages get blue ticks.
      socketService.on<{ conversationId: string }>(SOCKET_EVENTS.MESSAGE_READ, event => {
        if (event.conversationId === conversationId) setMessages(previous => previous.map(m => (m.isMe && m.status === 'sent' ? { ...m, status: 'read' } : m)));
      }),
      socketService.on<{ conversationId: string; messageId: string }>(SOCKET_EVENTS.MESSAGE_DELETE, event => {
        if (event.conversationId !== conversationId) return;
        // Gone for everyone – replies keep a "deleted" quote.
        setMessages(previous =>
          previous.filter(m => m.id !== event.messageId).map(m => (m.replyTo?.messageId === event.messageId ? { ...m, replyTo: { ...m.replyTo, text: undefined, deleted: true } } : m)),
        );
      }),
      socketService.on<{ conversationId: string; messageId: string; text: string }>(SOCKET_EVENTS.MESSAGE_EDIT, event => {
        if (event.conversationId !== conversationId) return;
        setMessages(previous => previous.map(m => (m.id === event.messageId ? { ...m, text: event.text } : m)));
      }),
      socketService.on<{ userId: string }>(SOCKET_EVENTS.USER_BLOCKED, event => {
        setBlockedUserIds(prev => (prev.includes(event.userId) ? prev : [...prev, event.userId]));
      }),
      socketService.on<{ userId: string }>(SOCKET_EVENTS.USER_UNBLOCKED, event => {
        setBlockedUserIds(prev => prev.filter(id => id !== event.userId));
      }),
      // You cleared this chat (or all chats) – maybe on another device.
      socketService.on<{ conversationId: string | null }>(SOCKET_EVENTS.CONVERSATION_CLEARED, event => {
        if (event.conversationId === null || event.conversationId === conversationId) {
          setMessages(previous => previous.filter(m => m.status === 'sending'));
          setHasMore(false);
        }
      }),
      socketService.on<{ roomId: string; userId: string; name: string }>(SOCKET_EVENTS.USER_TYPING, event => {
        if (event.roomId !== conversationId || event.userId === myId) return;
        clearTimeout(timers.get(event.userId));
        timers.set(event.userId, setTimeout(() => stopTypingOf(event.userId), TYPING_TIMEOUT_MS));
        setTyping(previous => (previous.some(t => t.userId === event.userId) ? previous : [...previous, { userId: event.userId, name: event.name }]));
      }),
      socketService.on<{ roomId: string; userId: string }>(SOCKET_EVENTS.USER_STOP_TYPING, event => {
        if (event.roomId === conversationId) stopTypingOf(event.userId);
      }),
      // Presence: online as soon as they connect, offline (+ last seen) when they disconnect.
      socketService.on<{ userId: string }>(SOCKET_EVENTS.USER_ONLINE, event =>
        setConversation(current => current && { ...current, participants: current.participants.map(p => (p.id === event.userId ? { ...p, isOnline: true } : p)) }),
      ),
      socketService.on<{ userId: string; lastSeen?: string }>(SOCKET_EVENTS.USER_OFFLINE, event => {
        stopTypingOf(event.userId);
        setConversation(current => current && { ...current, participants: current.participants.map(p => (p.id === event.userId ? { ...p, isOnline: false, lastSeen: event.lastSeen ?? p.lastSeen } : p)) });
      }),
{{#if GROUP_CHAT}}
      socketService.on<{ conversationId: string }>(SOCKET_EVENTS.CONVERSATION_UPDATED, event => {
        if (event.conversationId === conversationId) chatService.fetchConversation(conversationId).then(setConversation).catch(() => undefined);
      }),
      socketService.on<{ conversationId: string }>(SOCKET_EVENTS.CONVERSATION_REMOVED, event => {
        if (event.conversationId === conversationId) setRemoved(true);
      }),
{{/if}}
    ];

    return () => {
      socketService.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId: conversationId });
      subscriptions.forEach(off => off());
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [conversationId, load, myId, stopTypingOf, upsert]);

  /** Older messages when the user scrolls to the top. */
  const loadOlder = useCallback(async () => {
    const oldest = messages.find(m => m.status !== 'sending' && m.status !== 'failed');
    if (!hasMore || loadingOlder || !oldest) return;
    setLoadingOlder(true);
    try {
      const page = await chatService.fetchMessages(conversationId, oldest.id);
      setMessages(previous => [...page.items.map(m => ({ ...m, isMe: m.senderId === myId })), ...previous].sort(byDate));
      setHasMore(page.hasMore);
    } catch (error) {
      flash.error({ message: errorMessage(error) });
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasMore, loadingOlder, messages, myId]);

  /**
   * Sends text or a local file: shown at once ("sending"), uploaded, then replaced by the
   * server's copy. A failed message stays in the list ("failed") and can be sent again.
   */
  const send = useCallback(
    async (draft: MessageDraft, existingId?: string) => {
      const localId = existingId ?? `local-${Date.now()}`;
      // A reply shows its quote at once (the server's copy has the same one).
      const original = draft.replyToId ? messages.find(m => m.id === draft.replyToId) : undefined;
      const replyTo = original ? { messageId: original.id, senderId: original.senderId, senderName: original.senderName, type: original.type, text: original.text ?? original.fileName } : undefined;
      upsert({ ...draft, ...(replyTo ? { replyTo } : {}), id: localId, conversationId, senderId: myId ?? '', senderName: user?.name ?? '', createdAt: new Date().toISOString(), status: 'sending' });
      try {
        upsert(await chatService.sendMessage(conversationId, draft), localId);
      } catch (error) {
        setMessages(previous => previous.map(m => (m.id === localId ? { ...m, status: 'failed' } : m)));
        flash.error({ message: errorMessage(error) });
      }
    },
    [conversationId, messages, myId, upsert, user?.name],
  );

  const retry = useCallback(
    (message: ChatMessage) => {
      // Only messages you sent can fail – never a system message.
      if (message.type === 'system') return;
      const { text, mediaUrl, thumbnailUrl, fileName, fileSize, mimeType, duration, crop, replyTo } = message;
      send({ type: message.type, text, mediaUrl, thumbnailUrl, fileName, fileSize, mimeType, duration, crop, replyToId: replyTo?.messageId }, message.id);
    },
    [send],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await chatService.deleteMessage(conversationId, messageId);
        setMessages(previous => previous.filter(m => m.id !== messageId));
      } catch (error) {
        flash.error({ message: errorMessage(error) });
      }
    },
    [conversationId],
  );

  // Tell the others while the user is typing.
  const typingState = useRef<{ lastSent: number; timer?: ReturnType<typeof setTimeout> }>({ lastSent: 0 });
  const notifyTyping = useCallback(() => {
    const state = typingState.current;
    if (Date.now() - state.lastSent > TYPING_THROTTLE_MS) {
      socketService.emit(SOCKET_EVENTS.USER_TYPING, { roomId: conversationId });
      state.lastSent = Date.now();
    }
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      socketService.emit(SOCKET_EVENTS.USER_STOP_TYPING, { roomId: conversationId });
      state.lastSent = 0;
    }, TYPING_IDLE_MS);
  }, [conversationId]);

  useEffect(() => () => clearTimeout(typingState.current.timer), []);

  /** Direct chat: the other person's presence. */
  const other = useMemo(() => ({{#if GROUP_CHAT}}conversation?.isGroup ? undefined : {{/if}}conversation?.participants[0]), [conversation]);

  const editMessage = useCallback(
    async (messageId: string, text: string) => {
      setMessages(previous => previous.map(m => (m.id === messageId ? { ...m, text } : m)));
      try {
        await chatService.editMessage(conversationId, messageId, text);
      } catch (error) {
        load();
        flash.error({ message: errorMessage(error) });
      }
    },
    [conversationId, load],
  );

  const blockUser = useCallback(async () => {
    if (!other) return;
    try {
      await chatService.blockUser(other.id);
      setBlockedUserIds(prev => (prev.includes(other.id) ? prev : [...prev, other.id]));
      flash.success({ message: translate('common', 'userBlocked') });
    } catch (error) {
      flash.error({ message: errorMessage(error) });
    }
  }, [other]);

  const unblockUser = useCallback(async () => {
    if (!other) return;
    try {
      await chatService.unblockUser(other.id);
      setBlockedUserIds(prev => prev.filter(id => id !== other.id));
      flash.success({ message: translate('common', 'userUnblocked') });
    } catch (error) {
      flash.error({ message: errorMessage(error) });
    }
  }, [other]);

  const isBlocked = useMemo(() => (other ? blockedUserIds.includes(other.id) : false), [other, blockedUserIds]);

  return {
    myId,
    conversation,
    other,
    messages,
    loading,
    hasMore,
    loadingOlder,
    typing,
{{#if GROUP_CHAT}}
    removed,
{{/if}}
    isBlocked,
    blockUser,
    unblockUser,
    loadOlder,
    send,
    retry,
    deleteMessage,
    editMessage,
    notifyTyping,
  };
}
