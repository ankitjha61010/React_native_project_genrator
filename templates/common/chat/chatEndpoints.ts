/**
 * Chat API paths (relative to API_BASE_URL, e.g. http://localhost:3000/api/v1).
 * They match the backend's /chat routes – see its docs/API.md.
 */
const id = (value: string) => encodeURIComponent(value);

export const CHAT_ENDPOINTS = {
  // Conversations
  CONVERSATIONS: '/chat/conversations',
  CONVERSATION: (conversationId: string) => `/chat/conversations/${id(conversationId)}`,
  /** "Clear chat" / "Clear all chats" – for you only. */
  CLEAR_CONVERSATION: (conversationId: string) => `/chat/conversations/${id(conversationId)}/clear`,
  CLEAR_ALL_CONVERSATIONS: '/chat/conversations/clear',

  // Messages
  MESSAGES: (conversationId: string) => `/chat/conversations/${id(conversationId)}/messages`,
  MESSAGE: (conversationId: string, messageId: string) => `/chat/conversations/${id(conversationId)}/messages/${id(messageId)}`,
  MARK_READ: (conversationId: string) => `/chat/conversations/${id(conversationId)}/read`,

  // Blocking
  BLOCKED_USERS: '/chat/blocked-users',
  BLOCK_USER: (userId: string) => `/chat/users/${id(userId)}/block`,
  UNBLOCK_USER: (userId: string) => `/chat/users/${id(userId)}/unblock`,

  // Media uploads (multipart field `file`)
  UPLOAD_MEDIA: '/chat/upload',
  UPLOAD_VOICE_NOTE: '/chat/upload-voice',
{{#if GROUP_CHAT}}

  // Groups
  GROUPS: '/chat/groups',
  GROUP: (conversationId: string) => `/chat/groups/${id(conversationId)}`,
  GROUP_MEMBERS: (conversationId: string) => `/chat/groups/${id(conversationId)}/members`,
  GROUP_MEMBER: (conversationId: string, userId: string) => `/chat/groups/${id(conversationId)}/members/${id(userId)}`,
  LEAVE_GROUP: (conversationId: string) => `/chat/groups/${id(conversationId)}/leave`,
{{/if}}
} as const;
