/**
 * Centralized Socket.io Event Definitions.
 * Put all emit and on event keys here so they can be easily updated and referenced across the app.
 */
export const SOCKET_EVENTS = {
  // Connection Lifecycle
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',

  // Authentication & Session
  AUTHENTICATE: 'auth:authenticate',
  AUTHENTICATED: 'auth:authenticated',
  UNAUTHORIZED: 'auth:unauthorized',

  // User Presence & Status
  USER_ONLINE: 'presence:user_online',
  USER_OFFLINE: 'presence:user_offline',
  USER_TYPING: 'presence:typing',
  USER_STOP_TYPING: 'presence:stop_typing',

  // Chat & Messaging
  JOIN_ROOM: 'chat:join_room',
  LEAVE_ROOM: 'chat:leave_room',
  SEND_MESSAGE: 'chat:send_message',
  RECEIVE_MESSAGE: 'chat:receive_message',
  MESSAGE_DELIVERED: 'chat:message_delivered',
  MESSAGE_READ: 'chat:message_read',
  MESSAGE_DELETE: 'chat:message_deleted',
  MESSAGE_REACTION: 'chat:message_reaction',

  // Notifications
  PUSH_NOTIFICATION: 'notification:new',
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
