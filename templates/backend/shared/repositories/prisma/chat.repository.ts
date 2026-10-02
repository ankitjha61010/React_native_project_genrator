import type { Conversation, ConversationMember, MediaCrop, Message, MessageType, SystemEvent } from '{{IMPORT:domain.chat}}';
import type { ChatRepository, CreateConversationData, CreateMessageData } from '{{IMPORT:contract.chat}}';
import type { PrismaClient } from '{{IMPORT:db.connection}}';

type MessageRecord = NonNullable<Awaited<ReturnType<PrismaClient['message']['findUnique']>>>;
{{#if GROUP_CHAT}}
type MemberRecord = NonNullable<Awaited<ReturnType<PrismaClient['conversationMember']['findUnique']>>>;

const toMember = ({ role, ...record }: MemberRecord): ConversationMember => ({ ...record, role: role === 'admin' ? 'admin' : 'member' });
{{/if}}

const toMessage = ({ crop, type, event, ...record }: MessageRecord): Message => ({ ...record, type: type as MessageType, event: event as SystemEvent | null, crop: (crop as MediaCrop | null) ?? null });

export class PrismaChatRepository implements ChatRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createConversation({ memberIds, ...conversation }: CreateConversationData): Promise<Conversation> {
{{#if GROUP_CHAT}}
    const role = (userId: string) => (conversation.isGroup && userId === conversation.createdById ? 'admin' : 'member');
    return this.prisma.conversation.create({ data: { ...conversation, members: { create: memberIds.map(userId => ({ userId, role: role(userId) })) } } });
{{else}}
    return this.prisma.conversation.create({ data: { ...conversation, members: { create: memberIds.map(userId => ({ userId })) } } });
{{/if}}
  }

  findConversation(id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({ where: { id } });
  }
{{#if GROUP_CHAT}}

  updateConversation(id: string, data: Partial<Pick<Conversation, 'title' | 'avatarUrl'>>): Promise<Conversation> {
    return this.prisma.conversation.update({ where: { id }, data });
  }
{{/if}}

  findDirectConversation(userId: string, otherUserId: string): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({ where: { {{#if GROUP_CHAT}}isGroup: false, {{/if}}AND: [{ members: { some: { userId } } }, { members: { some: { userId: otherUserId } } }] } });
  }

  listConversations(userId: string): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({ where: { members: { some: { userId } } }, orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }] });
  }

  async deleteConversation(id: string): Promise<void> {
    await this.prisma.conversation.deleteMany({ where: { id } });
  }

{{#if GROUP_CHAT}}
  async listMembers(conversationIds: string[]): Promise<ConversationMember[]> {
    if (!conversationIds.length) return [];
    // Oldest member first – the next admin when the last one leaves.
    return (await this.prisma.conversationMember.findMany({ where: { conversationId: { in: conversationIds } }, orderBy: { joinedAt: 'asc' } })).map(toMember);
  }

  async findMember(conversationId: string, userId: string): Promise<ConversationMember | null> {
    const record = await this.prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    return record ? toMember(record) : null;
  }

  async updateMember(conversationId: string, userId: string, data: Partial<Pick<ConversationMember, 'lastReadAt' | 'clearedAt' | 'hidden' | 'role'>>): Promise<void> {
    await this.prisma.conversationMember.updateMany({ where: { conversationId, userId }, data });
  }

  async addMembers(conversationId: string, userIds: string[]): Promise<void> {
    await this.prisma.conversationMember.createMany({ data: userIds.map(userId => ({ conversationId, userId, role: 'member' })), skipDuplicates: true });
  }
{{else}}
  listMembers(conversationIds: string[]): Promise<ConversationMember[]> {
    return conversationIds.length ? this.prisma.conversationMember.findMany({ where: { conversationId: { in: conversationIds } } }) : Promise.resolve([]);
  }

  findMember(conversationId: string, userId: string): Promise<ConversationMember | null> {
    return this.prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
  }

  async updateMember(conversationId: string, userId: string, data: Partial<Pick<ConversationMember, 'lastReadAt' | 'clearedAt' | 'hidden'>>): Promise<void> {
    await this.prisma.conversationMember.updateMany({ where: { conversationId, userId }, data });
  }
{{/if}}

  async updateMemberships(userId: string, data: Partial<Pick<ConversationMember, 'clearedAt' | 'hidden'>>): Promise<void> {
    await this.prisma.conversationMember.updateMany({ where: { userId }, data });
  }

  async removeMember(conversationId: string, userId: string): Promise<void> {
    await this.prisma.conversationMember.deleteMany({ where: { conversationId, userId } });
  }

  async createMessage({ crop, ...data }: CreateMessageData): Promise<Message> {
    const [message] = await this.prisma.$transaction([
      // Stored as JSON.
      this.prisma.message.create({ data: { ...data, crop: (crop ?? undefined) as Record<string, number | string> | undefined } }),
      this.prisma.conversation.update({ where: { id: data.conversationId }, data: { lastMessageAt: new Date() } }),
    ]);
    return toMessage(message);
  }

  async findMessage(id: string): Promise<Message | null> {
    const record = await this.prisma.message.findUnique({ where: { id } });
    return record ? toMessage(record) : null;
  }

  async findMessages(ids: string[]): Promise<Message[]> {
    return ids.length ? (await this.prisma.message.findMany({ where: { id: { in: ids } } })).map(toMessage) : [];
  }

  async listMessages(conversationId: string, options: { after?: Date | null; before?: Pick<Message, 'createdAt' | 'id'>; limit: number }): Promise<Message[]> {
    const { after, before } = options;
    const records = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(after ? { createdAt: { gt: after } } : {}),
        // Older than the cursor – messages of the same millisecond are ordered by id.
        ...(before ? { OR: [{ createdAt: { lt: before.createdAt } }, { createdAt: before.createdAt, id: { lt: before.id } }] } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit,
    });
    return records.map(toMessage);
  }

  async lastMessages(conversationIds: string[]): Promise<Message[]> {
    if (!conversationIds.length) return [];
    const records = await this.prisma.message.findMany({
      where: { conversationId: { in: conversationIds }, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      distinct: ['conversationId'],
    });
    return records.map(toMessage);
  }

  countUnread(conversationId: string, userId: string, since: Date | null, after: Date | null): Promise<number> {
    const from = since && after ? (since > after ? since : after) : (since ?? after);
    return this.prisma.message.count({ where: { conversationId, deletedAt: null, senderId: { not: userId }, type: { not: 'system' }, ...(from ? { createdAt: { gt: from } } : {}) } });
  }

  async softDeleteMessage(id: string): Promise<void> {
    await this.prisma.message.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async updateMessageText(id: string, text: string): Promise<Message | null> {
    const record = await this.prisma.message.update({ where: { id }, data: { text } });
    return toMessage(record);
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    await (this.prisma as any).blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await (this.prisma as any).blockedUser.deleteMany({
      where: { blockerId, blockedId },
    });
  }

  async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    const count = await (this.prisma as any).blockedUser.count({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
    });
    return count > 0;
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    const list = await (this.prisma as any).blockedUser.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    return list.map((b: { blockedId: string }) => b.blockedId);
  }
}
