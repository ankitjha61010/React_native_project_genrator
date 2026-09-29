import { Brackets, In, IsNull, type DataSource, type Repository } from 'typeorm';
import type { Conversation, ConversationMember, Message, MessageType } from '{{IMPORT:domain.chat}}';
import type { ChatRepository, CreateConversationData, CreateMessageData } from '{{IMPORT:contract.chat}}';
import { ConversationMemberOrmEntity, ConversationOrmEntity, MessageOrmEntity } from '{{IMPORT:typeorm.chat}}';

const toConversation = (e: ConversationOrmEntity): Conversation => ({
  id: e.id,
{{#if GROUP_CHAT}}
  title: e.title,
  isGroup: e.isGroup,
  avatarUrl: e.avatarUrl,
{{/if}}
  createdById: e.createdById,
  lastMessageAt: e.lastMessageAt,
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
});

const toMember = (e: ConversationMemberOrmEntity): ConversationMember => ({
  conversationId: e.conversationId,
  userId: e.userId,
{{#if GROUP_CHAT}}
  role: e.role === 'admin' ? 'admin' : 'member',
{{/if}}
  lastReadAt: e.lastReadAt,
  clearedAt: e.clearedAt,
  joinedAt: e.joinedAt,
});

const toMessage = (e: MessageOrmEntity): Message => ({
  id: e.id,
  conversationId: e.conversationId,
  senderId: e.senderId,
  type: e.type as MessageType,
  text: e.text,
  mediaUrl: e.mediaUrl,
  thumbnailUrl: e.thumbnailUrl,
  fileName: e.fileName,
  fileSize: e.fileSize,
  duration: e.duration,
  crop: e.crop,
  createdAt: e.createdAt,
  deletedAt: e.deletedAt,
});

export class TypeOrmChatRepository implements ChatRepository {
  private readonly conversations: Repository<ConversationOrmEntity>;
  private readonly members: Repository<ConversationMemberOrmEntity>;
  private readonly messages: Repository<MessageOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.conversations = dataSource.getRepository(ConversationOrmEntity);
    this.members = dataSource.getRepository(ConversationMemberOrmEntity);
    this.messages = dataSource.getRepository(MessageOrmEntity);
  }

  createConversation({ memberIds, ...data }: CreateConversationData): Promise<Conversation> {
    return this.dataSource.transaction(async manager => {
      const conversation = await manager.save(manager.create(ConversationOrmEntity, { ...data, lastMessageAt: null }));
{{#if GROUP_CHAT}}
      const role = (userId: string) => (data.isGroup && userId === data.createdById ? 'admin' : 'member');
      await manager.save(memberIds.map(userId => manager.create(ConversationMemberOrmEntity, { conversationId: conversation.id, userId, role: role(userId), lastReadAt: null, clearedAt: null })));
{{else}}
      await manager.save(memberIds.map(userId => manager.create(ConversationMemberOrmEntity, { conversationId: conversation.id, userId, lastReadAt: null, clearedAt: null })));
{{/if}}
      return toConversation(conversation);
    });
  }

  async findConversation(id: string): Promise<Conversation | null> {
    const entity = await this.conversations.findOneBy({ id });
    return entity ? toConversation(entity) : null;
  }
{{#if GROUP_CHAT}}

  async updateConversation(id: string, data: Partial<Pick<Conversation, 'title' | 'avatarUrl'>>): Promise<Conversation> {
    await this.conversations.update({ id }, data);
    return toConversation(await this.conversations.findOneByOrFail({ id }));
  }
{{/if}}

  async findDirectConversation(userId: string, otherUserId: string): Promise<Conversation | null> {
    const entity = await this.conversations
      .createQueryBuilder('c')
      .innerJoin(ConversationMemberOrmEntity, 'a', 'a.conversation_id = c.id AND a.user_id = :userId', { userId })
      .innerJoin(ConversationMemberOrmEntity, 'b', 'b.conversation_id = c.id AND b.user_id = :otherUserId', { otherUserId })
{{#if GROUP_CHAT}}
      .where('c.isGroup = :isGroup', { isGroup: false })
{{/if}}
      .getOne();
    return entity ? toConversation(entity) : null;
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    const entities = await this.conversations
      .createQueryBuilder('c')
      .innerJoin(ConversationMemberOrmEntity, 'm', 'm.conversation_id = c.id AND m.user_id = :userId', { userId })
      .orderBy('c.lastMessageAt', 'DESC')
      .addOrderBy('c.createdAt', 'DESC')
      .getMany();
    return entities.map(toConversation);
  }

  async deleteConversation(id: string): Promise<void> {
    await this.conversations.delete({ id });
  }

  async listMembers(conversationIds: string[]): Promise<ConversationMember[]> {
{{#if GROUP_CHAT}}
    if (!conversationIds.length) return [];
    // Oldest member first – the next admin when the last one leaves.
    return (await this.members.find({ where: { conversationId: In(conversationIds) }, order: { joinedAt: 'ASC' } })).map(toMember);
{{else}}
    return conversationIds.length ? (await this.members.findBy({ conversationId: In(conversationIds) })).map(toMember) : [];
{{/if}}
  }

  async findMember(conversationId: string, userId: string): Promise<ConversationMember | null> {
    const entity = await this.members.findOneBy({ conversationId, userId });
    return entity ? toMember(entity) : null;
  }

  async updateMember(conversationId: string, userId: string, data: Partial<Pick<ConversationMember, 'lastReadAt' | 'clearedAt'{{#if GROUP_CHAT}} | 'role'{{/if}}>>): Promise<void> {
    await this.members.update({ conversationId, userId }, data);
  }
{{#if GROUP_CHAT}}

  async addMembers(conversationId: string, userIds: string[]): Promise<void> {
    // Existing members are left as they are (ON CONFLICT DO NOTHING / INSERT IGNORE).
    await this.members
      .createQueryBuilder()
      .insert()
      .values(userIds.map(userId => ({ conversationId, userId, role: 'member', lastReadAt: null, clearedAt: null })))
      .orIgnore()
      .execute();
  }
{{/if}}

  async removeMember(conversationId: string, userId: string): Promise<void> {
    await this.members.delete({ conversationId, userId });
  }

  createMessage(data: CreateMessageData): Promise<Message> {
    return this.dataSource.transaction(async manager => {
      const message = await manager.save(
        manager.create(MessageOrmEntity, {
          text: null,
          mediaUrl: null,
          thumbnailUrl: null,
          fileName: null,
          fileSize: null,
          duration: null,
          crop: null,
          deletedAt: null,
          ...data,
        }),
      );
      await manager.update(ConversationOrmEntity, { id: data.conversationId }, { lastMessageAt: message.createdAt });
      return toMessage(message);
    });
  }

  async findMessage(id: string): Promise<Message | null> {
    const entity = await this.messages.findOneBy({ id });
    return entity ? toMessage(entity) : null;
  }

  async listMessages(conversationId: string, options: { after?: Date | null; before?: Pick<Message, 'createdAt' | 'id'>; limit: number }): Promise<Message[]> {
    const { after, before } = options;
    const qb = this.messages
      .createQueryBuilder('m')
      .where('m.conversationId = :conversationId AND m.deletedAt IS NULL', { conversationId })
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .take(options.limit);
    if (after) qb.andWhere('m.createdAt > :after', { after });
    // Older than the cursor – messages of the same millisecond are ordered by id.
    if (before) qb.andWhere(new Brackets(w => w.where('m.createdAt < :at', { at: before.createdAt }).orWhere('m.createdAt = :at AND m.id < :id', { id: before.id })));
    return (await qb.getMany()).map(toMessage);
  }

  async lastMessages(conversationIds: string[]): Promise<Message[]> {
    if (!conversationIds.length) return [];
    // The newest message per conversation (no newer message exists in the same conversation).
    const entities = await this.messages
      .createQueryBuilder('m')
      .where('m.conversationId IN (:...ids) AND m.deletedAt IS NULL', { ids: conversationIds })
      .andWhere(qb => {
        const newer = qb
          .subQuery()
          .select('1')
          .from(MessageOrmEntity, 'n')
          .where('n.conversation_id = m.conversation_id AND n.deleted_at IS NULL')
          .andWhere('(n.created_at > m.created_at OR (n.created_at = m.created_at AND n.id > m.id))')
          .getQuery();
        return `NOT EXISTS ${newer}`;
      })
      .getMany();
    return entities.map(toMessage);
  }

  async countUnread(conversationId: string, userId: string, since: Date | null, after: Date | null): Promise<number> {
    const from = since && after ? (since > after ? since : after) : (since ?? after);
    const qb = this.messages.createQueryBuilder('m').where('m.conversationId = :conversationId AND m.deletedAt IS NULL AND m.senderId != :userId', { conversationId, userId });
    if (from) qb.andWhere('m.createdAt > :from', { from });
    return qb.getCount();
  }

  async softDeleteMessage(id: string): Promise<void> {
    await this.messages.update({ id, deletedAt: IsNull() }, { deletedAt: new Date() });
  }
}
