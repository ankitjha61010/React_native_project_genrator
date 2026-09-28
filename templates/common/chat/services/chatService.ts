import { api } from '{{IMPORT:api.client}}';
import type { ChatMessage, Conversation } from '{{IMPORT:chat.types}}';
import { CHAT_ENDPOINTS } from '../chatEndpoints';

/** Someone to start a chat with (GET /users/search). */
export interface ChatContact {
  id: string;
  name: string;
  avatar: string | null;
}

interface UploadedMedia {
  url: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
};

const FALLBACK_MIME: Record<ChatMessage['type'], string> = {
  text: 'text/plain',
  image: 'image/jpeg',
  video: 'video/mp4',
  audio: 'audio/mp4',
  document: 'application/pdf',
};

/** A file on the device (not yet on the server). */
const isLocalFile = (uri: string) => !/^https?:\/\//.test(uri);

function mimeOf(uri: string, type: ChatMessage['type']): string {
  const extension = /\.([a-z0-9]+)(?:\?|$)/i.exec(uri)?.[1]?.toLowerCase();
  return (extension && MIME_BY_EXTENSION[extension]) || FALLBACK_MIME[type];
}

async function upload(uri: string, type: ChatMessage['type'], fileName?: string): Promise<UploadedMedia> {
  const name = fileName ?? uri.split('/').pop() ?? 'file';
  const endpoint = type === 'audio' ? CHAT_ENDPOINTS.UPLOAD_VOICE_NOTE : CHAT_ENDPOINTS.UPLOAD_MEDIA;
  return api.upload<UploadedMedia>(endpoint, 'file', { uri, name, type: mimeOf(name, type) });
}

/** Chat requests (the backend's /chat routes). Live updates arrive over Socket.IO. */
export const chatService = {
  fetchConversations: () => api.get<Conversation[]>(CHAT_ENDPOINTS.GET_CONVERSATIONS),

  fetchConversation: (conversationId: string) => api.get<Conversation>(CHAT_ENDPOINTS.GET_CONVERSATION_DETAILS(conversationId)),

  /** Opens the direct chat with one person (reuses it if it exists) or creates a group. */
  startConversation: (participantIds: string[], group?: { title: string }) =>
    api.post<Conversation>(CHAT_ENDPOINTS.CREATE_CONVERSATION, { participantIds, ...(group ? { isGroup: true, title: group.title } : {}) }),

  deleteConversation: (conversationId: string) => api.delete<null>(CHAT_ENDPOINTS.DELETE_CONVERSATION(conversationId)),

  /** Oldest → newest. Pass the oldest loaded message id as `before` to load earlier ones. */
  async fetchMessages(conversationId: string, before?: string): Promise<{ items: ChatMessage[]; hasMore: boolean }> {
    const page = await api.page<ChatMessage>(CHAT_ENDPOINTS.GET_MESSAGES(conversationId), { params: { limit: 30, ...(before ? { before } : {}) } });
    return { items: page.items, hasMore: Boolean(page.meta.hasMore) };
  },

  /** Uploads local media first, then sends the message (members get it over Socket.IO). */
  async sendMessage(conversationId: string, message: Partial<ChatMessage>): Promise<ChatMessage> {
    const type = message.type ?? 'text';
    const body: Partial<ChatMessage> = { type, text: message.text, fileName: message.fileName, fileSize: message.fileSize, duration: message.duration, crop: message.crop };
    if (message.mediaUrl) {
      if (isLocalFile(message.mediaUrl)) {
        const uploaded = await upload(message.mediaUrl, type, message.fileName);
        Object.assign(body, { mediaUrl: uploaded.url, fileName: message.fileName ?? uploaded.fileName, fileSize: message.fileSize ?? uploaded.fileSize });
      } else {
        body.mediaUrl = message.mediaUrl;
      }
    }
    if (message.thumbnailUrl) {
      body.thumbnailUrl = isLocalFile(message.thumbnailUrl) ? (await upload(message.thumbnailUrl, 'image')).url : message.thumbnailUrl;
    }
    return api.post<ChatMessage>(CHAT_ENDPOINTS.SEND_MESSAGE(conversationId), body);
  },

  markRead: (conversationId: string) => api.post<null>(CHAT_ENDPOINTS.MARK_READ(conversationId)),

  deleteMessage: (conversationId: string, messageId: string) => api.delete<null>(CHAT_ENDPOINTS.DELETE_MESSAGE(conversationId, messageId)),

  searchContacts: (query: string) => api.get<ChatContact[]>(CHAT_ENDPOINTS.SEARCH_USERS, { params: { q: query } }),
};
