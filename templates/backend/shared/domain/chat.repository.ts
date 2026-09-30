import type { Conversation, ConversationMember, MediaCrop, Message, MessageType, SystemEvent } from '{{IMPORT:domain.chat}}';

export interface CreateConversationData {
  createdById: string;
  /** Every member, the creator included.{{#if GROUP_CHAT}} In a group the creator becomes its admin.{{/if}} */
  memberIds: string[];
{{#if GROUP_CHAT}}
  isGroup: boolean;
  title: string | null;
  avatarUrl: string | null;
{{/if}}
}

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
  event?: SystemEvent | null;
  targetUserId?: string | null;
  replyToId?: string | null;
}

/** Conversations, their members and messages. */
export interface ChatRepository {
  createConversation(data: CreateConversationData): Promise<Conversation>;
  findConversation(id: string): Promise<Conversation | null>;
{{#if GROUP_CHAT}}
  /** Group name / image. */
  updateConversation(id: string, data: Partial<Pick<Conversation, 'title' | 'avatarUrl'>>): Promise<Conversation>;
{{/if}}
  /** The 1:1 conversation between two users, if any. */
  findDirectConversation(userId: string, otherUserId: string): Promise<Conversation | null>;
  /** Every conversation the user is a member of, newest activity first. */
  listConversations(userId: string): Promise<Conversation[]>;
  deleteConversation(id: string): Promise<void>;

  listMembers(conversationIds: string[]): Promise<ConversationMember[]>;
  findMember(conversationId: string, userId: string): Promise<ConversationMember | null>;
  updateMember(conversationId: string, userId: string, data: Partial<Pick<ConversationMember, 'lastReadAt' | 'clearedAt' | 'hidden'{{#if GROUP_CHAT}} | 'role'{{/if}}>>): Promise<void>;
  /** Every membership of the user at once ("Clear all chats"). */
  updateMemberships(userId: string, data: Partial<Pick<ConversationMember, 'clearedAt' | 'hidden'>>): Promise<void>;
{{#if GROUP_CHAT}}
  /** New group members (role `member`). */
  addMembers(conversationId: string, userIds: string[]): Promise<void>;
{{/if}}
  removeMember(conversationId: string, userId: string): Promise<void>;

  /** Stores the message and bumps the conversation's `lastMessageAt`. */
  createMessage(data: CreateMessageData): Promise<Message>;
  findMessage(id: string): Promise<Message | null>;
  /** The originals of replies (deleted ones included). */
  findMessages(ids: string[]): Promise<Message[]>;
  /**
   * Newest first (createdAt, then id). `after`: hide older messages ("delete chat");
   * `before`: the oldest message already loaded (pagination cursor).
   */
  listMessages(conversationId: string, options: { after?: Date | null; before?: Pick<Message, 'createdAt' | 'id'>; limit: number }): Promise<Message[]>;
  /** The newest non-deleted message of each conversation. */
  lastMessages(conversationIds: string[]): Promise<Message[]>;
  /** Messages from others created after `since` (and after `after`) – `system` messages don't count. */
  countUnread(conversationId: string, userId: string, since: Date | null, after: Date | null): Promise<number>;
  softDeleteMessage(id: string): Promise<void>;
}
