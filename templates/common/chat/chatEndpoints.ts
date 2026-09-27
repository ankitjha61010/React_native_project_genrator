/**
 * Centralized Chat API Endpoints.
 * Change any dummy URL or path here to point to your live chat server.
 */
export const CHAT_ENDPOINTS = {
  // Conversations / Rooms
  GET_CONVERSATIONS: '/api/v1/chat/conversations',
  CREATE_CONVERSATION: '/api/v1/chat/conversations',
  GET_CONVERSATION_DETAILS: (id: string) => `/api/v1/chat/conversations/${id}`,
  DELETE_CONVERSATION: (id: string) => `/api/v1/chat/conversations/${id}`,

  // Messages
  GET_MESSAGES: (conversationId: string) => `/api/v1/chat/conversations/${conversationId}/messages`,
  SEND_MESSAGE: (conversationId: string) => `/api/v1/chat/conversations/${conversationId}/messages`,
  MARK_READ: (conversationId: string) => `/api/v1/chat/conversations/${conversationId}/read`,
  DELETE_MESSAGE: (conversationId: string, messageId: string) =>
    `/api/v1/chat/conversations/${conversationId}/messages/${messageId}`,

  // Media Uploads
  UPLOAD_MEDIA: '/api/v1/chat/upload',
  UPLOAD_VOICE_NOTE: '/api/v1/chat/upload-voice',
} as const;
