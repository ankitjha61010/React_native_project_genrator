/**
 * Chat API paths (relative to API_BASE_URL, e.g. http://localhost:3000/api/v1).
 * They match the generated backend's /chat routes – see its docs/API.md.
 */
export const CHAT_ENDPOINTS = {
  // Conversations
  GET_CONVERSATIONS: '/chat/conversations',
  CREATE_CONVERSATION: '/chat/conversations',
  GET_CONVERSATION_DETAILS: (id: string) => `/chat/conversations/${encodeURIComponent(id)}`,
  DELETE_CONVERSATION: (id: string) => `/chat/conversations/${encodeURIComponent(id)}`,

  // Messages
  GET_MESSAGES: (conversationId: string) => `/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
  SEND_MESSAGE: (conversationId: string) => `/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
  MARK_READ: (conversationId: string) => `/chat/conversations/${encodeURIComponent(conversationId)}/read`,
  DELETE_MESSAGE: (conversationId: string, messageId: string) =>
    `/chat/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,

  // Media uploads (multipart field `file`)
  UPLOAD_MEDIA: '/chat/upload',
  UPLOAD_VOICE_NOTE: '/chat/upload-voice',

  // People to start a chat with
  SEARCH_USERS: '/users/search',
} as const;
