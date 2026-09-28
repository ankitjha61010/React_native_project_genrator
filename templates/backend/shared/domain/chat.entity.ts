export const MESSAGE_TYPES = ['text', 'image', 'video', 'audio', 'document'] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

/** How the app cropped / filtered an image before sending it (stored as-is). */
export interface MediaCrop {
  width: number;
  height: number;
  aspectRatio: string;
  rotation?: number;
  filter?: 'normal' | 'warm' | 'cool' | 'mono';
  outputWidth?: number;
  outputHeight?: number;
}

export interface Conversation {
  id: string;
  /** Groups only – a direct chat is titled with the other person's name. */
  title: string | null;
  isGroup: boolean;
  avatarUrl: string | null;
  createdById: string;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMember {
  conversationId: string;
  userId: string;
  /** Messages up to this moment are read. */
  lastReadAt: Date | null;
  /** "Delete chat": messages before this moment are hidden for this member. */
  clearedAt: Date | null;
  joinedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  text: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  fileName: string | null;
  /** Human readable, e.g. "2.4 MB". */
  fileSize: string | null;
  /** Seconds (audio / video). */
  duration: number | null;
  crop: MediaCrop | null;
  createdAt: Date;
  deletedAt: Date | null;
}

// ── API shapes (the app's chat types) ────────────────────────────────────────

export interface ChatParticipantView {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface ChatMessageView {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: string;
  duration?: number;
  crop?: MediaCrop;
  createdAt: string;
  status: 'sent' | 'read';
  /** Set in REST responses (it depends on who asks); socket events leave it out. */
  isMe?: boolean;
}

export interface ConversationView {
  id: string;
  title: string;
  avatar?: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessage?: ChatMessageView;
  participants: ChatParticipantView[];
  updatedAt: string;
}
