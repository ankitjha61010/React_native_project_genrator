import type { Conversation, ConversationMember, MediaCrop, Message, MessageType } from '{{IMPORT:domain.chat}}';
import type { ChatRepository, CreateMessageData } from '{{IMPORT:contract.chat}}';
import type { PrismaClient } from '{{IMPORT:db.connection}}';

type MessageRecord = NonNullable<Awaited<ReturnType<PrismaClient['message']['findUnique']>>>;

const toMessage = ({ crop, type, ...record }: MessageRecord): Message => ({ ...record, type: type as MessageType, crop: (crop as MediaCrop | null) ?? null });

export class PrismaChatRepository implements ChatRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createConversation(data: { isGroup: boolean; title: string | null; createdById: string; memberIds: string[] }): Promise<Conversation> {
    const { memberIds, ...conversation } = data;
    return this.prisma.conversation.create({ data: { ...conversation, members: { create: memberIds.map(userId => ({ userId })) } } });
  }

  findConversation(id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({ where: { id } });
  }

  findDirectConversation(userId: string, otherUserId: string): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({ where: { isGroup: false, AND: [{ members: { some: { userId } } }, { members: { some: { userId: otherUserId } } }] } });
  }

  listConversations(userId: string): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({ where: { members: { some: { userId } } }, orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }] });
  }

  async deleteConversation(id: string): Promise<void> {
    await this.prisma.conversation.deleteMany({ where: { id } });
  }

  listMembers(conversationIds: string[]): Promise<ConversationMember[]> {
    return conversationIds.length ? this.prisma.conversationMember.findMany({ where: { conversationId: { in: conversationIds } } }) : Promise.resolve([]);
  }

  findMember(conversationId: string, userId: string): Promise<ConversationMember | null> {
    return this.prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
  }

  async updateMember(conversationId: string, userId: string, data: Partial<Pick<ConversationMember, 'lastReadAt' | 'clearedAt'>>): Promise<void> {
    await this.prisma.conversationMember.updateMany({ where: { conversationId, userId }, data });
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
    return this.prisma.message.count({ where: { conversationId, deletedAt: null, senderId: { not: userId }, ...(from ? { createdAt: { gt: from } } : {}) } });
  }

  async softDeleteMessage(id: string): Promise<void> {
    await this.prisma.message.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
