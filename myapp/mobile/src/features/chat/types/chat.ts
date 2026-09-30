/** Group admins add / remove members, rename the group, change its image and appoint admins. */
export type MemberRole = 'admin' | 'member';

export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  /** ISO date – shown as "last seen …" while offline. */
  lastSeen?: string;
  role?: MemberRole;
}

/** `system`: written by the backend ("Jane added John") – never sent by the app. */
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'system';
/** What the app can send. */
export type SendableMessageType = Exclude<MessageType, 'system'>;

/** What a `system` message says happened – the app renders its own text per event. */
export type SystemEvent = 'MEMBER_ADDED';

export interface ChatPerson {
  id: string;
  name: string;
}

/** The quoted message above a reply. */
export interface ReplyTo {
  messageId: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  /** Text, or a document's file name. */
  text?: string;
  /** The original was deleted. */
  deleted?: boolean;
}

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
  /** `system` messages: `{ event, actor, target }` → "Jane added John". */
  event?: SystemEvent;
  actor?: ChatPerson;
  target?: ChatPerson;
  /** This message replies to another one. */
  replyTo?: ReplyTo;
  createdAt: string;
  status: 'sending' | 'sent' | 'read' | 'failed';
  isMe?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  avatar?: string;
  isGroup?: boolean;
  /** Your role in this conversation. */
  myRole?: MemberRole;
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
