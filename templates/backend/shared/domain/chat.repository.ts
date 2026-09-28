import type { Conversation, ConversationMember, MediaCrop, Message, MessageType } from '{{IMPORT:domain.chat}}';

export interface CreateMessageData {
  conversationId: string;
  senderId: string;
  type: MessageType;
  text?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
  duration?: number | null;
  crop?: MediaCrop | null;
}

/** Conversations, their members and messages. */
export interface ChatRepository {
  createConversation(data: { isGroup: boolean; title: string | null; createdById: string; memberIds: string[] }): Promise<Conversation>;
  findConversation(id: string): Promise<Conversation | null>;
  /** The 1:1 conversation between two users, if any. */
  findDirectConversation(userId: string, otherUserId: string): Promise<Conversation | null>;
  /** Every conversation the user is a member of, newest activity first. */
  listConversations(userId: string): Promise<Conversation[]>;
  deleteConversation(id: string): Promise<void>;

  listMembers(conversationIds: string[]): Promise<ConversationMember[]>;
  findMember(conversationId: string, userId: string): Promise<ConversationMember | null>;
  updateMember(conversationId: string, userId: string, data: Partial<Pick<ConversationMember, 'lastReadAt' | 'clearedAt'>>): Promise<void>;
  removeMember(conversationId: string, userId: string): Promise<void>;

  /** Stores the message and bumps the conversation's `lastMessageAt`. */
  createMessage(data: CreateMessageData): Promise<Message>;
  findMessage(id: string): Promise<Message | null>;
  /**
   * Newest first (createdAt, then id). `after`: hide older messages ("delete chat");
   * `before`: the oldest message already loaded (pagination cursor).
   */
  listMessages(conversationId: string, options: { after?: Date | null; before?: Pick<Message, 'createdAt' | 'id'>; limit: number }): Promise<Message[]>;
  /** The newest non-deleted message of each conversation. */
  lastMessages(conversationIds: string[]): Promise<Message[]>;
  /** Messages from others created after `since` (and after `after`). */
  countUnread(conversationId: string, userId: string, since: Date | null, after: Date | null): Promise<number>;
  softDeleteMessage(id: string): Promise<void>;
}
