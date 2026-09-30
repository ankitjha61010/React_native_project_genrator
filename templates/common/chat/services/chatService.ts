import { api } from '{{IMPORT:api.client}}';
import { forDevice } from '{{IMPORT:config.env}}';
import type { ChatMessage, Conversation, SendableMessageType } from '{{IMPORT:chat.types}}';
import { CHAT_ENDPOINTS } from '../chatEndpoints';

/** POST /chat/upload answer – send `url` as the message's `mediaUrl`. */
interface UploadedMedia {
  url: string;
  type: SendableMessageType;
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
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  csv: 'text/csv',
  txt: 'text/plain',
};

const FALLBACK_MIME: Record<SendableMessageType, string> = {
  text: 'text/plain',
  image: 'image/jpeg',
  video: 'video/mp4',
  audio: 'audio/mp4',
  document: 'application/octet-stream',
};

/** A file on the device (not yet on the server). */
export const isLocalFile = (uri: string) => !/^https?:\/\//.test(uri);

function mimeOf(name: string, type: SendableMessageType, known?: string): string {
  if (known) return known;
  const extension = /\.([a-z0-9]+)(?:\?|$)/i.exec(name)?.[1]?.toLowerCase();
  return (extension && MIME_BY_EXTENSION[extension]) || FALLBACK_MIME[type];
}

/** Uploads a local file (multipart) – the answer is the stored file's URL. */
function upload(uri: string, type: SendableMessageType, fileName?: string, mimeType?: string): Promise<UploadedMedia> {
  const name = fileName ?? uri.split('/').pop() ?? 'file';
  const endpoint = type === 'audio' ? CHAT_ENDPOINTS.UPLOAD_VOICE_NOTE : CHAT_ENDPOINTS.UPLOAD_MEDIA;
  return api.upload<UploadedMedia>(endpoint, 'file', { uri, name, type: mimeOf(name, type, mimeType) });
}

/** Server URLs point at `localhost` in development – the Android emulator needs 10.0.2.2. */
const url = (value?: string) => (value ? forDevice(value) : value);

export function normalizeMessage(message: ChatMessage): ChatMessage {
  return { ...message, mediaUrl: url(message.mediaUrl), thumbnailUrl: url(message.thumbnailUrl), senderAvatar: url(message.senderAvatar) };
}

export function normalizeConversation(conversation: Conversation): Conversation {
  return {
    ...conversation,
    avatar: url(conversation.avatar),
    lastMessage: conversation.lastMessage ? normalizeMessage(conversation.lastMessage) : undefined,
    participants: conversation.participants.map(p => ({ ...p, avatar: url(p.avatar) })),
  };
}

/** What the input bar sends: text, or a local / uploaded file with its details. */
export type MessageDraft = { type: SendableMessageType } & Partial<Pick<ChatMessage, 'text' | 'mediaUrl' | 'thumbnailUrl' | 'fileName' | 'fileSize' | 'mimeType' | 'duration' | 'crop'>> & {
  /** Reply: the quoted message. */
  replyToId?: string;
};

/** Chat requests (the backend's /chat routes). Live updates arrive over Socket.IO. */
export const chatService = {
  fetchConversations: async () => (await api.get<Conversation[]>(CHAT_ENDPOINTS.CONVERSATIONS)).map(normalizeConversation),

  fetchConversation: async (conversationId: string) => normalizeConversation(await api.get<Conversation>(CHAT_ENDPOINTS.CONVERSATION(conversationId))),

  /** Opens the direct chat with one person (the existing one is reused). */
  startConversation: async (otherUserId: string) => normalizeConversation(await api.post<Conversation>(CHAT_ENDPOINTS.CONVERSATIONS, { participantIds: [otherUserId] })),

  /** Hides a direct chat until a new message arrives{{#if GROUP_CHAT}}; leaves a group{{/if}}. */
  deleteConversation: (conversationId: string) => api.delete<null>(CHAT_ENDPOINTS.CONVERSATION(conversationId)),

  /** "Clear chat": its messages disappear for you only; the chat stays in the list. */
  clearConversation: (conversationId: string) => api.post<null>(CHAT_ENDPOINTS.CLEAR_CONVERSATION(conversationId)),

  /** "Clear all chats": every conversation, for you only. */
  clearAllConversations: () => api.post<null>(CHAT_ENDPOINTS.CLEAR_ALL_CONVERSATIONS),

  /** Oldest → newest. Pass the oldest loaded message id as `before` to load earlier ones. */
  async fetchMessages(conversationId: string, before?: string): Promise<{ items: ChatMessage[]; hasMore: boolean }> {
    const page = await api.page<ChatMessage>(CHAT_ENDPOINTS.MESSAGES(conversationId), { params: { limit: 30, ...(before ? { before } : {}) } });
    return { items: page.items.map(normalizeMessage), hasMore: Boolean(page.meta.hasMore) };
  },

  /** Uploads a local file first (image / video / document / voice note), then sends the message. */
  async sendMessage(conversationId: string, draft: MessageDraft): Promise<ChatMessage> {
    const { mimeType, ...body } = draft;
    if (body.mediaUrl && isLocalFile(body.mediaUrl)) {
      const uploaded = await upload(body.mediaUrl, body.type, body.fileName, mimeType);
      Object.assign(body, { mediaUrl: uploaded.url, fileName: body.fileName ?? uploaded.fileName, fileSize: body.fileSize ?? uploaded.fileSize });
    }
    if (body.thumbnailUrl && isLocalFile(body.thumbnailUrl)) {
      body.thumbnailUrl = (await upload(body.thumbnailUrl, 'image')).url;
    }
    return normalizeMessage(await api.post<ChatMessage>(CHAT_ENDPOINTS.MESSAGES(conversationId), body));
  },

  markRead: (conversationId: string) => api.post<null>(CHAT_ENDPOINTS.MARK_READ(conversationId)),

  deleteMessage: (conversationId: string, messageId: string) => api.delete<null>(CHAT_ENDPOINTS.MESSAGE(conversationId, messageId)),
{{#if GROUP_CHAT}}

  /** Uploads a picked group image; send the URL with createGroup / updateGroup. */
  uploadImage: async (uri: string, fileName?: string, mimeType?: string) => (await upload(uri, 'image', fileName, mimeType)).url,
{{/if}}
};
