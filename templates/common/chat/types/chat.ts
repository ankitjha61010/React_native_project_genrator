{{#if GROUP_CHAT}}
/** Group admins add / remove members, rename the group, change its image and appoint admins. */
export type MemberRole = 'admin' | 'member';

{{/if}}
export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  /** ISO date – shown as "last seen …" while offline. */
  lastSeen?: string;
{{#if GROUP_CHAT}}
  role?: MemberRole;
{{/if}}
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document';

export interface ChatMessageCrop {
  width: number;
  height: number;
  aspectRatio: string;
  rotation?: number;
  filter?: 'normal' | 'warm' | 'cool' | 'mono';
  /** Pixel size of the (already cropped) media file. */
  outputWidth?: number;
  outputHeight?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: MessageType;
  text?: string;
  /** A server URL – or, while the message is still sending, the local file. */
  mediaUrl?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: string;
  /** MIME type of a local file that is still being uploaded. */
  mimeType?: string;
  duration?: number; // seconds (audio / video)
  crop?: ChatMessageCrop;
  createdAt: string;
  status: 'sending' | 'sent' | 'read' | 'failed';
  isMe?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  avatar?: string;
{{#if GROUP_CHAT}}
  isGroup?: boolean;
  /** Your role in this conversation. */
  myRole?: MemberRole;
{{/if}}
  unreadCount?: number;
  lastMessage?: ChatMessage;
  /** Everybody except you. */
  participants: ChatParticipant[];
  updatedAt: string;
}

/** Someone typing in the open conversation. */
export interface TypingUser {
  userId: string;
  name: string;
}
