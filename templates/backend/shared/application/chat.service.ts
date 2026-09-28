import { BadRequestError, ForbiddenError, NotFoundError } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { ChatMessageView, Conversation, ConversationMember, ConversationView, MediaCrop, Message, MessageType } from '{{IMPORT:domain.chat}}';
import type { User } from '{{IMPORT:domain.user}}';
import type { ChatRepository } from '{{IMPORT:contract.chat}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { FileStorage, UploadedFile } from '{{IMPORT:port.fileStorage}}';
{{#if CHAT_PUSH}}
import type { PushMessage } from '{{IMPORT:port.pushSender}}';
{{/if}}
import type { Realtime } from '{{IMPORT:port.realtime}}';

export interface StartConversationInput {
  participantIds: string[];
  /** Groups only. */
  title?: string;
  isGroup?: boolean;
}

export interface SendMessageInput {
  type: MessageType;
  text?: string;
  /** URL returned by the upload endpoint. */
  mediaUrl?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: string;
  duration?: number;
  crop?: MediaCrop;
}

export interface UploadedMedia {
  url: string;
  type: MessageType;
  fileName: string;
  fileSize: string;
  mimeType: string;
}

export interface ChatDependencies {
  chat: ChatRepository;
  users: UsersRepository;
  storage: FileStorage;
  realtime: Realtime;
{{#if CHAT_PUSH}}
  /** Pushes to users' devices (NotificationsService.push, or the notifications service). */
  push: (userIds: string[], message: PushMessage) => Promise<void>;
{{/if}}
  logger: Logger;
}

/** Socket.IO events (same names as the app's socketEvents.ts). */
export const CHAT_EVENTS = {
  receiveMessage: 'chat:receive_message',
  messageRead: 'chat:message_read',
  messageDeleted: 'chat:message_deleted',
} as const;

const MEDIA_TYPES: Array<[RegExp, MessageType]> = [
  [/^image\/(jpeg|png|gif|webp|heic|heif)$/, 'image'],
  [/^video\/(mp4|quicktime|3gpp|webm)$/, 'video'],
  [/^audio\/(mpeg|mp4|aac|x-m4a|m4a|ogg|wav|webm|3gpp)$/, 'audio'],
  [/^(application\/(pdf|msword|zip|vnd\.openxmlformats-officedocument\.[\w.]+|vnd\.ms-(excel|powerpoint))|text\/plain)$/, 'document'],
];

function humanSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

/**
 * WhatsApp-style chat: direct and group conversations, text / media messages, read
 * receipts, "delete chat". Live updates go through `Realtime`{{#if CHAT_PUSH}}; members who are offline get a push{{/if}}.
 */
export class ChatService {
  constructor(private readonly deps: ChatDependencies) {}

  async listConversations(userId: string): Promise<ConversationView[]> {
    const conversations = await this.deps.chat.listConversations(userId);
    return this.views(userId, conversations);
  }

  async getConversation(userId: string, conversationId: string): Promise<ConversationView> {
    const { conversation } = await this.requireMember(userId, conversationId);
    const [view] = await this.views(userId, [conversation], true);
    return view;
  }

  /** Opens the direct chat with one person (reusing an existing one) or creates a group. */
  async startConversation(userId: string, input: StartConversationInput): Promise<ConversationView> {
    const otherIds = [...new Set(input.participantIds)].filter(id => id !== userId);
    const isGroup = input.isGroup ?? otherIds.length > 1;
    if (!otherIds.length) throw new BadRequestError('Pick at least one other participant', 'NO_PARTICIPANTS');
    if (!isGroup && otherIds.length > 1) throw new BadRequestError('A direct chat has exactly one other participant', 'TOO_MANY_PARTICIPANTS');
    if (isGroup && !input.title?.trim()) throw new BadRequestError('A group needs a title', 'TITLE_REQUIRED');

    const found = await this.deps.users.findManyByIds(otherIds);
    if (found.filter(u => u.isActive).length !== otherIds.length) throw new NotFoundError('Some participants were not found', 'USER_NOT_FOUND');

    if (!isGroup) {
      const existing = await this.deps.chat.findDirectConversation(userId, otherIds[0]);
      if (existing) {
        // Un-hide a chat the user had deleted.
        await this.deps.chat.updateMember(existing.id, userId, { clearedAt: null });
        return this.getConversation(userId, existing.id);
      }
    }
    const conversation = await this.deps.chat.createConversation({ isGroup, title: isGroup ? input.title!.trim() : null, createdById: userId, memberIds: [userId, ...otherIds] });
    return this.getConversation(userId, conversation.id);
  }

  /** "Delete chat": hides a direct chat until a new message arrives; leaves a group. */
  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    const { conversation } = await this.requireMember(userId, conversationId);
    if (!conversation.isGroup) {
      await this.deps.chat.updateMember(conversationId, userId, { clearedAt: new Date() });
      return;
    }
    await this.deps.chat.removeMember(conversationId, userId);
    const remaining = await this.deps.chat.listMembers([conversationId]);
    if (!remaining.length) await this.deps.chat.deleteConversation(conversationId);
  }

  /** Oldest → newest. `before`: id of the oldest message already shown (loads older ones). */
  async listMessages(userId: string, conversationId: string, options: { before?: string; limit: number }): Promise<{ items: ChatMessageView[]; hasMore: boolean }> {
    const { member } = await this.requireMember(userId, conversationId);
    const cursor = options.before ? await this.deps.chat.findMessage(options.before) : null;
    if (options.before && cursor?.conversationId !== conversationId) throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');

    const page = await this.deps.chat.listMessages(conversationId, { after: member.clearedAt, before: cursor ?? undefined, limit: options.limit + 1 });
    const messages = page.slice(0, options.limit).toReversed();
    const members = await this.deps.chat.listMembers([conversationId]);
    const senders = await this.usersById(messages.map(m => m.senderId));
    return { items: messages.map(m => this.messageView(m, senders, members, userId)), hasMore: page.length > options.limit };
  }

  async sendMessage(userId: string, conversationId: string, input: SendMessageInput): Promise<ChatMessageView> {
    await this.requireMember(userId, conversationId);
    const text = input.text?.trim() || null;
    if (input.type === 'text' && !text) throw new BadRequestError('A text message needs text', 'EMPTY_MESSAGE');
    if (input.type !== 'text' && !input.mediaUrl) throw new BadRequestError('Upload the file first and send its mediaUrl', 'MEDIA_REQUIRED');

    const message = await this.deps.chat.createMessage({
      conversationId,
      senderId: userId,
      type: input.type,
      text,
      mediaUrl: input.mediaUrl ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      fileName: input.fileName ?? null,
      fileSize: input.fileSize ?? null,
      duration: input.duration ?? null,
      crop: input.crop ?? null,
    });
    // Sending counts as reading everything before.
    await this.deps.chat.updateMember(conversationId, userId, { lastReadAt: message.createdAt });

    const members = await this.deps.chat.listMembers([conversationId]);
    const senders = await this.usersById([userId]);
    const view = this.messageView(message, senders, members, userId);
    const { isMe: _isMe, ...event } = view;
    for (const member of members) this.deps.realtime.toUser(member.userId, CHAT_EVENTS.receiveMessage, event);
{{#if CHAT_PUSH}}
    await this.pushToOffline(message, members, senders.get(userId));
{{/if}}
    return view;
  }

  /** Marks everything in the conversation as read and tells the other members (blue ticks). */
  async markRead(userId: string, conversationId: string): Promise<void> {
    await this.requireMember(userId, conversationId);
    const readAt = new Date();
    await this.deps.chat.updateMember(conversationId, userId, { lastReadAt: readAt });
    const members = await this.deps.chat.listMembers([conversationId]);
    for (const member of members) {
      if (member.userId !== userId) this.deps.realtime.toUser(member.userId, CHAT_EVENTS.messageRead, { conversationId, userId, readAt: readAt.toISOString() });
    }
  }

  /** Deletes one of your own messages for everyone. */
  async deleteMessage(userId: string, conversationId: string, messageId: string): Promise<void> {
    await this.requireMember(userId, conversationId);
    const message = await this.deps.chat.findMessage(messageId);
    if (!message || message.conversationId !== conversationId || message.deletedAt) throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    if (message.senderId !== userId) throw new ForbiddenError('You can only delete your own messages', 'NOT_YOUR_MESSAGE');

    await this.deps.chat.softDeleteMessage(messageId);
    for (const url of [message.mediaUrl, message.thumbnailUrl]) {
      if (url) await this.deps.storage.delete(url).catch(error => this.deps.logger.warn({ err: error }, 'Chat media not deleted'));
    }
    const members = await this.deps.chat.listMembers([conversationId]);
    for (const member of members) this.deps.realtime.toUser(member.userId, CHAT_EVENTS.messageDeleted, { conversationId, messageId });
  }

  /** Stores an attachment; send its `url` as the message's `mediaUrl`. */
  async uploadMedia(userId: string, file: UploadedFile, voiceNote = false): Promise<UploadedMedia> {
    const type = MEDIA_TYPES.find(([pattern]) => pattern.test(file.mimeType))?.[1];
    if (!type || (voiceNote && type !== 'audio')) throw new BadRequestError(`Files of type ${file.mimeType} can't be sent`, 'INVALID_FILE_TYPE');
    const stored = await this.deps.storage.save(file, `chat/${userId}`);
    return { url: stored.url, type, fileName: stored.fileName, fileSize: humanSize(stored.size), mimeType: stored.mimeType };
  }

  /** Socket rooms: may this user join the conversation? */
  async isMember(userId: string, conversationId: string): Promise<boolean> {
    return (await this.deps.chat.findMember(conversationId, userId)) !== null;
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async requireMember(userId: string, conversationId: string): Promise<{ conversation: Conversation; member: ConversationMember }> {
    const [conversation, member] = await Promise.all([this.deps.chat.findConversation(conversationId), this.deps.chat.findMember(conversationId, userId)]);
    if (!conversation || !member) throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    return { conversation, member };
  }

  private async usersById(ids: string[]): Promise<Map<string, User>> {
    const users = await this.deps.users.findManyByIds([...new Set(ids)]);
    return new Map(users.map(user => [user.id, user]));
  }

  /** Builds the app's Conversation objects. Chats the user deleted stay hidden until a new message. */
  private async views(userId: string, conversations: Conversation[], includeHidden = false): Promise<ConversationView[]> {
    if (!conversations.length) return [];
    const ids = conversations.map(c => c.id);
    const [members, lastMessages] = await Promise.all([this.deps.chat.listMembers(ids), this.deps.chat.lastMessages(ids)]);
    const users = await this.usersById([...members.map(m => m.userId), ...lastMessages.map(m => m.senderId)]);
    const views: ConversationView[] = [];

    for (const conversation of conversations) {
      const convMembers = members.filter(m => m.conversationId === conversation.id);
      const me = convMembers.find(m => m.userId === userId);
      if (!me) continue;
      const last = lastMessages.find(m => m.conversationId === conversation.id && (!me.clearedAt || m.createdAt > me.clearedAt));
      if (!includeHidden && me.clearedAt && !last) continue;

      const others = convMembers.filter(m => m.userId !== userId).map(m => users.get(m.userId)).filter(u => u !== undefined);
      const direct = !conversation.isGroup ? others[0] : undefined;
      views.push({
        id: conversation.id,
        title: conversation.title ?? direct?.name ?? 'Chat',
        ...((conversation.avatarUrl ?? direct?.avatarUrl) ? { avatar: (conversation.avatarUrl ?? direct?.avatarUrl)! } : {}),
        isGroup: conversation.isGroup,
        unreadCount: await this.deps.chat.countUnread(conversation.id, userId, me.lastReadAt, me.clearedAt),
        ...(last ? { lastMessage: this.messageView(last, users, convMembers, userId) } : {}),
        participants: others.map(u => ({
          id: u.id,
          name: u.name,
          ...(u.avatarUrl ? { avatar: u.avatarUrl } : {}),
          isOnline: this.deps.realtime.isOnline(u.id),
          ...(u.lastSeenAt ? { lastSeen: u.lastSeenAt.toISOString() } : {}),
        })),
        updatedAt: (conversation.lastMessageAt ?? conversation.createdAt).toISOString(),
      });
    }
    return views.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private messageView(message: Message, users: Map<string, User>, members: ConversationMember[], viewerId: string): ChatMessageView {
    const sender = users.get(message.senderId);
    // Read = every other member has read up to this message.
    const others = members.filter(m => m.userId !== message.senderId);
    const read = others.length > 0 && others.every(m => m.lastReadAt && m.lastReadAt >= message.createdAt);
    const optional = { text: message.text, mediaUrl: message.mediaUrl, thumbnailUrl: message.thumbnailUrl, fileName: message.fileName, fileSize: message.fileSize, duration: message.duration, crop: message.crop };
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: sender?.name ?? 'Deleted user',
      ...(sender?.avatarUrl ? { senderAvatar: sender.avatarUrl } : {}),
      type: message.type,
      // The app's types use optional fields – leave out what isn't set.
      ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== null)),
      createdAt: message.createdAt.toISOString(),
      status: read ? 'read' : 'sent',
      isMe: message.senderId === viewerId,
    };
  }
{{#if CHAT_PUSH}}

  /** Push to members who aren't connected (the app shows it; tapping opens the chat). */
  private async pushToOffline(message: Message, members: ConversationMember[], sender: User | undefined): Promise<void> {
    const offline = members.filter(m => m.userId !== message.senderId && !this.deps.realtime.isOnline(m.userId)).map(m => m.userId);
    if (!offline.length) return;
    const preview = message.type === 'text' ? (message.text ?? '') : `📎 ${message.type === 'image' ? 'Photo' : message.type === 'video' ? 'Video' : message.type === 'audio' ? 'Voice message' : (message.fileName ?? 'Document')}`;
    await this.deps
      .push(offline, {
        title: sender?.name ?? 'New message',
        body: preview.slice(0, 180),
        data: { type: 'chat', conversationId: message.conversationId, senderName: sender?.name ?? '', senderAvatar: sender?.avatarUrl ?? '', sentAt: message.createdAt.toISOString() },
      })
      .catch(error => this.deps.logger.error({ err: error }, 'Chat push failed'));
  }
{{/if}}
}
