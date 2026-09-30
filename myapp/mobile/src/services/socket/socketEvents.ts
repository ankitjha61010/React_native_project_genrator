/**
 * Every Socket.IO event name of the app – the same names as the backend's socket server.
 * Use these constants instead of strings.
 */
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',

  // Presence: server → app `{ userId, lastSeen? }`; typing: both ways `{ roomId }` (server adds `userId`, `name`)
  USER_ONLINE: 'presence:user_online',
  USER_OFFLINE: 'presence:user_offline',
  USER_TYPING: 'presence:typing',
  USER_STOP_TYPING: 'presence:stop_typing',

  // Chat
  JOIN_ROOM: 'chat:join_room',
  LEAVE_ROOM: 'chat:leave_room',
  RECEIVE_MESSAGE: 'chat:receive_message',
  MESSAGE_READ: 'chat:message_read',
  MESSAGE_DELETE: 'chat:message_deleted',
  /** You cleared a chat (`conversationId`) or all chats (`conversationId: null`), maybe on another device. */
  CONVERSATION_CLEARED: 'chat:conversation_cleared',
  /** A group changed (name, image, members, admins) – reload it. */
  CONVERSATION_UPDATED: 'chat:conversation_updated',
  /** You left / were removed from a group. */
  CONVERSATION_REMOVED: 'chat:conversation_removed',

  // Notifications
  PUSH_NOTIFICATION: 'notification:new',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
