import { BadRequestError, ForbiddenError, NotFoundError } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { ChatMessageView, Conversation, ConversationMember, ConversationView, MediaCrop, Message, MessageType{{#if GROUP_CHAT}}, MemberRole{{/if}} } from '{{IMPORT:domain.chat}}';
import type { User } from '{{IMPORT:domain.user}}';
import type { ChatRepository } from '{{IMPORT:contract.chat}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { FileStorage, UploadedFile } from '{{IMPORT:port.fileStorage}}';
{{#if CHAT_PUSH}}
import type { PushMessage } from '{{IMPORT:port.pushSender}}';
{{/if}}
import type { Realtime } from '{{IMPORT:port.realtime}}';
import { CHAT_MESSAGES } from '{{IMPORT:messages.chat}}';
import { humanSize, {{#if CHAT_PUSH}}messagePreview, {{/if}}messageTypeOf } from '{{IMPORT:app.chatUtils}}';

export interface StartConversationInput {
  /** The other person (a direct chat has exactly one). */
  participantIds: string[];
}
{{#if GROUP_CHAT}}

export interface CreateGroupInput {
  title: string;
  participantIds: string[];
  /** URL returned by the upload endpoint. */
  avatarUrl?: string | null;
}

export interface UpdateGroupInput {
  title?: string;
  avatarUrl?: string | null;
}
{{/if}}

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
{{#if GROUP_CHAT}}
  /** A group changed (name, image, members, admins) – the app reloads it. */
  conversationUpdated: 'chat:conversation_updated',
  /** You are no longer a member (removed / left) – the app closes it. */
  conversationRemoved: 'chat:conversation_removed',
{{/if}}
} as const;
{{#if GROUP_CHAT}}

/** What changed in a group (payload of `chat:conversation_updated`). */
export type GroupChange = 'created' | 'renamed' | 'image_changed' | 'members_added' | 'member_removed' | 'member_left' | 'role_changed';
{{/if}}

/**
 * WhatsApp-style chat: {{#if GROUP_CHAT}}direct and group conversations{{else}}direct conversations{{/if}}, text / media messages, read
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

  /** Opens the direct chat with one person (reusing the existing one). */
  async startConversation(userId: string, input: StartConversationInput): Promise<ConversationView> {
    const otherIds = [...new Set(input.participantIds)].filter(id => id !== userId);
    if (!otherIds.length) throw new BadRequestError(CHAT_MESSAGES.noParticipants);
    if (otherIds.length > 1) throw new BadRequestError(CHAT_MESSAGES.tooManyParticipants);
    await this.assertActiveUsers(otherIds);

    const existing = await this.deps.chat.findDirectConversation(userId, otherIds[0]);
    if (existing) {
      // Un-hide a chat the user had deleted.
      await this.deps.chat.updateMember(existing.id, userId, { clearedAt: null });
      return this.getConversation(userId, existing.id);
    }
    const conversation = await this.deps.chat.createConversation({ createdById: userId, memberIds: [userId, ...otherIds]{{#if GROUP_CHAT}}, isGroup: false, title: null, avatarUrl: null{{/if}} });
    return this.getConversation(userId, conversation.id);
  }

  /** "Delete chat": hides a direct chat until a new message arrives{{#if GROUP_CHAT}}; leaves a group{{/if}}. */
  async deleteConversation(userId: string, conversationId: string): Promise<void> {
{{#if GROUP_CHAT}}
    const { conversation } = await this.requireMember(userId, conversationId);
    if (conversation.isGroup) return this.leaveGroup(userId, conversationId);
{{else}}
    await this.requireMember(userId, conversationId);
{{/if}}
    await this.deps.chat.updateMember(conversationId, userId, { clearedAt: new Date() });
  }
{{#if GROUP_CHAT}}

  // ── groups ─────────────────────────────────────────────────────────────────

  /** Creates a group; the creator is its first admin. */
  async createGroup(userId: string, input: CreateGroupInput): Promise<ConversationView> {
    const title = input.title.trim();
    if (!title) throw new BadRequestError(CHAT_MESSAGES.titleRequired);
    const otherIds = [...new Set(input.participantIds)].filter(id => id !== userId);
    if (!otherIds.length) throw new BadRequestError(CHAT_MESSAGES.noParticipants);
    await this.assertActiveUsers(otherIds);

    const conversation = await this.deps.chat.createConversation({ createdById: userId, memberIds: [userId, ...otherIds], isGroup: true, title, avatarUrl: input.avatarUrl ?? null });
    await this.notifyGroup(conversation.id, 'created', userId);
    return this.getConversation(userId, conversation.id);
  }

  /** Group name / image (admins only). */
  async updateGroup(userId: string, conversationId: string, input: UpdateGroupInput): Promise<ConversationView> {
    const { conversation } = await this.requireAdmin(userId, conversationId);
    const title = input.title?.trim();
    if (input.title !== undefined && !title) throw new BadRequestError(CHAT_MESSAGES.titleRequired);
    await this.deps.chat.updateConversation(conversationId, { ...(title ? { title } : {}), ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}) });
    if (input.avatarUrl !== undefined && conversation.avatarUrl && conversation.avatarUrl !== input.avatarUrl) {
      await this.deps.storage.delete(conversation.avatarUrl).catch(error => this.deps.logger.warn({ err: error }, 'Old group image not deleted'));
    }
    await this.notifyGroup(conversationId, title ? 'renamed' : 'image_changed', userId);
    return this.getConversation(userId, conversationId);
  }

  /** Adds people to a group (admins only). People who are already members are skipped. */
  async addMembers(userId: string, conversationId: string, userIds: string[]): Promise<ConversationView> {
    await this.requireAdmin(userId, conversationId);
    const members = await this.deps.chat.listMembers([conversationId]);
    const newIds = [...new Set(userIds)].filter(id => !members.some(m => m.userId === id));
    if (newIds.length) {
      await this.assertActiveUsers(newIds);
      await this.deps.chat.addMembers(conversationId, newIds);
      await this.notifyGroup(conversationId, 'members_added', userId);
    }
    return this.getConversation(userId, conversationId);
  }

  /** Removes someone from a group (admins only – use leaveGroup for yourself). */
  async removeMember(userId: string, conversationId: string, memberId: string): Promise<ConversationView> {
    if (memberId === userId) throw new BadRequestError(CHAT_MESSAGES.removeYourself);
    await this.requireAdmin(userId, conversationId);
    if (!(await this.deps.chat.findMember(conversationId, memberId))) throw new NotFoundError(CHAT_MESSAGES.notAMember);
    await this.deps.chat.removeMember(conversationId, memberId);
    this.deps.realtime.toUser(memberId, CHAT_EVENTS.conversationRemoved, { conversationId });
    await this.notifyGroup(conversationId, 'member_removed', userId);
    return this.getConversation(userId, conversationId);
  }

  /** Makes a member an admin, or an admin a member again (admins only). */
  async setMemberRole(userId: string, conversationId: string, memberId: string, role: MemberRole): Promise<ConversationView> {
    await this.requireAdmin(userId, conversationId);
    if (!(await this.deps.chat.findMember(conversationId, memberId))) throw new NotFoundError(CHAT_MESSAGES.notAMember);
    await this.deps.chat.updateMember(conversationId, memberId, { role });
    // An admin who steps down may have been the last one.
    await this.ensureAdmin(conversationId);
    await this.notifyGroup(conversationId, 'role_changed', userId);
    return this.getConversation(userId, conversationId);
  }

  /**
   * Leaves a group. When the last admin leaves, the longest-standing member becomes admin;
   * when the last member leaves, the group is deleted.
   */
  async leaveGroup(userId: string, conversationId: string): Promise<void> {
    const { conversation } = await this.requireMember(userId, conversationId);
    if (!conversation.isGroup) throw new BadRequestError(CHAT_MESSAGES.notAGroup);
    await this.deps.chat.removeMember(conversationId, userId);
    this.deps.realtime.toUser(userId, CHAT_EVENTS.conversationRemoved, { conversationId });
    if (await this.ensureAdmin(conversationId)) await this.notifyGroup(conversationId, 'member_left', userId);
  }

  /** Before an account is deleted: leave every group (so each keeps an admin). */
  async leaveAllGroups(userId: string): Promise<void> {
    const conversations = await this.deps.chat.listConversations(userId);
    for (const conversation of conversations.filter(c => c.isGroup)) await this.leaveGroup(userId, conversation.id);
  }
{{/if}}

  /** Oldest → newest. `before`: id of the oldest message already shown (loads older ones). */
  async listMessages(userId: string, conversationId: string, options: { before?: string; limit: number }): Promise<{ items: ChatMessageView[]; hasMore: boolean }> {
    const { member } = await this.requireMember(userId, conversationId);
    const cursor = options.before ? await this.deps.chat.findMessage(options.before) : null;
    if (options.before && cursor?.conversationId !== conversationId) throw new NotFoundError(CHAT_MESSAGES.messageNotFound);

    const page = await this.deps.chat.listMessages(conversationId, { after: member.clearedAt, before: cursor ?? undefined, limit: options.limit + 1 });
    const messages = page.slice(0, options.limit).toReversed();
    const members = await this.deps.chat.listMembers([conversationId]);
    const senders = await this.usersById(messages.map(m => m.senderId));
    return { items: messages.map(m => this.messageView(m, senders, members, userId)), hasMore: page.length > options.limit };
  }

  async sendMessage(userId: string, conversationId: string, input: SendMessageInput): Promise<ChatMessageView> {
    await this.requireMember(userId, conversationId);
    const text = input.text?.trim() || null;
    if (input.type === 'text' && !text) throw new BadRequestError(CHAT_MESSAGES.emptyMessage);
    if (input.type !== 'text' && !input.mediaUrl) throw new BadRequestError(CHAT_MESSAGES.mediaRequired);

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
    if (!message || message.conversationId !== conversationId || message.deletedAt) throw new NotFoundError(CHAT_MESSAGES.messageNotFound);
    if (message.senderId !== userId) throw new ForbiddenError(CHAT_MESSAGES.notYourMessage);

    await this.deps.chat.softDeleteMessage(messageId);
    for (const url of [message.mediaUrl, message.thumbnailUrl]) {
      if (url) await this.deps.storage.delete(url).catch(error => this.deps.logger.warn({ err: error }, 'Chat media not deleted'));
    }
    const members = await this.deps.chat.listMembers([conversationId]);
    for (const member of members) this.deps.realtime.toUser(member.userId, CHAT_EVENTS.messageDeleted, { conversationId, messageId });
  }

  /** Stores an attachment; send its `url` as the message's `mediaUrl`. */
  async uploadMedia(userId: string, file: UploadedFile, voiceNote = false): Promise<UploadedMedia> {
    const type = messageTypeOf(file.mimeType);
    if (!type || (voiceNote && type !== 'audio')) throw new BadRequestError(CHAT_MESSAGES.invalidFileType(file.mimeType));
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
    if (!conversation || !member) throw new NotFoundError(CHAT_MESSAGES.conversationNotFound);
    return { conversation, member };
  }

  private async assertActiveUsers(userIds: string[]): Promise<void> {
    const found = await this.deps.users.findManyByIds(userIds);
    if (found.filter(u => u.isActive).length !== userIds.length) throw new NotFoundError(CHAT_MESSAGES.participantsNotFound);
  }
{{#if GROUP_CHAT}}

  private async requireAdmin(userId: string, conversationId: string): Promise<{ conversation: Conversation; member: ConversationMember }> {
    const found = await this.requireMember(userId, conversationId);
    if (!found.conversation.isGroup) throw new BadRequestError(CHAT_MESSAGES.notAGroup);
    if (found.member.role !== 'admin') throw new ForbiddenError(CHAT_MESSAGES.adminOnly);
    return found;
  }

  /** A group always keeps an admin: the longest-standing member takes over. False when the group is now empty (and deleted). */
  private async ensureAdmin(conversationId: string): Promise<boolean> {
    const members = await this.deps.chat.listMembers([conversationId]);
    if (!members.length) {
      await this.deps.chat.deleteConversation(conversationId);
      return false;
    }
    if (!members.some(m => m.role === 'admin')) await this.deps.chat.updateMember(conversationId, members[0].userId, { role: 'admin' });
    return true;
  }

  /** Tells every member that the group changed – their app reloads it. */
  private async notifyGroup(conversationId: string, change: GroupChange, byUserId: string): Promise<void> {
    const members = await this.deps.chat.listMembers([conversationId]);
    for (const member of members) this.deps.realtime.toUser(member.userId, CHAT_EVENTS.conversationUpdated, { conversationId, change, byUserId });
  }
{{/if}}

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

      const others = convMembers.filter(m => m.userId !== userId).flatMap(m => {
        const user = users.get(m.userId);
        return user ? [{ user, member: m }] : [];
      });
{{#if GROUP_CHAT}}
      const direct = !conversation.isGroup ? others[0]?.user : undefined;
      const title = conversation.title ?? direct?.name ?? CHAT_MESSAGES.untitled;
      const avatar = conversation.avatarUrl ?? direct?.avatarUrl;
{{else}}
      const direct = others[0]?.user;
      const title = direct?.name ?? CHAT_MESSAGES.untitled;
      const avatar = direct?.avatarUrl;
{{/if}}
      views.push({
        id: conversation.id,
        title,
        ...(avatar ? { avatar } : {}),
{{#if GROUP_CHAT}}
        isGroup: conversation.isGroup,
        myRole: me.role,
{{/if}}
        unreadCount: await this.deps.chat.countUnread(conversation.id, userId, me.lastReadAt, me.clearedAt),
        ...(last ? { lastMessage: this.messageView(last, users, convMembers, userId) } : {}),
        participants: others.map(({ user: u{{#if GROUP_CHAT}}, member{{/if}} }) => ({
          id: u.id,
          name: u.name,
          ...(u.avatarUrl ? { avatar: u.avatarUrl } : {}),
          isOnline: this.deps.realtime.isOnline(u.id),
          ...(u.lastSeenAt ? { lastSeen: u.lastSeenAt.toISOString() } : {}),
{{#if GROUP_CHAT}}
          role: member.role,
{{/if}}
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
      senderName: sender?.name ?? CHAT_MESSAGES.deletedUser,
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
    const preview = messagePreview(message);
    await this.deps
      .push(offline, {
        title: sender?.name ?? CHAT_MESSAGES.newMessagePush,
        body: preview.slice(0, 180),
        data: { type: 'chat', conversationId: message.conversationId, senderName: sender?.name ?? '', senderAvatar: sender?.avatarUrl ?? '', sentAt: message.createdAt.toISOString() },
      })
      .catch(error => this.deps.logger.error({ err: error }, 'Chat push failed'));
  }
{{/if}}
}
