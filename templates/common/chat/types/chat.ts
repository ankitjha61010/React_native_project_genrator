export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document';

export interface ChatMessageCrop {
  width: number;
  height: number;
  aspectRatio: string;
  rotation?: number;
  filter?: 'normal' | 'warm' | 'cool' | 'mono';
}

export interface ChatMessage {
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
  duration?: number; // In seconds (for audio / video)
  crop?: ChatMessageCrop;
  createdAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isMe?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  avatar?: string;
  isGroup?: boolean;
  unreadCount?: number;
  lastMessage?: ChatMessage;
  participants: ChatParticipant[];
  updatedAt: string;
}
