import { Types } from 'mongoose';
import type { Conversation, ConversationMember, MediaCrop, Message, MessageType, SystemEvent } from '{{IMPORT:domain.chat}}';
import type { ChatRepository, CreateConversationData, CreateMessageData } from '{{IMPORT:contract.chat}}';
import { isValidId } from '{{IMPORT:db.connection}}';
import { BlockedUserModel, ConversationMemberModel, ConversationModel, MessageModel, type ConversationDocument, type MemberDocument, type MessageDocument } from '{{IMPORT:mongoose.chat}}';

const toConversation = (d: ConversationDocument): Conversation => ({
  id: d._id.toString(),
{{#if GROUP_CHAT}}
  title: d.title ?? null,
  isGroup: d.isGroup,
  avatarUrl: d.avatarUrl ?? null,
{{/if}}
  createdById: d.createdById.toString(),
  lastMessageAt: d.lastMessageAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

const toMember = (d: MemberDocument): ConversationMember => ({
  conversationId: d.conversationId.toString(),
  userId: d.userId.toString(),
{{#if GROUP_CHAT}}
  role: d.role === 'admin' ? 'admin' : 'member',
{{/if}}
  lastReadAt: d.lastReadAt ?? null,
  clearedAt: d.clearedAt ?? null,
  hidden: d.hidden ?? false,
  joinedAt: d.joinedAt,
});

const toMessage = (d: MessageDocument): Message => ({
  id: d._id.toString(),
  conversationId: d.conversationId.toString(),
  senderId: d.senderId.toString(),
  type: d.type as MessageType,
  text: d.text ?? null,
  mediaUrl: d.mediaUrl ?? null,
  thumbnailUrl: d.thumbnailUrl ?? null,
  fileName: d.fileName ?? null,
  fileSize: d.fileSize ?? null,
  duration: d.duration ?? null,
  crop: (d.crop as MediaCrop | null) ?? null,
  event: (d.event as SystemEvent | null) ?? null,
  targetUserId: d.targetUserId?.toString() ?? null,
  replyToId: d.replyToId?.toString() ?? null,
  createdAt: d.createdAt,
  deletedAt: d.deletedAt ?? null,
});

const ids = (values: string[]) => values.filter(isValidId).map(id => new Types.ObjectId(id));

export class MongooseChatRepository implements ChatRepository {
  async createConversation({ memberIds, ...data }: CreateConversationData): Promise<Conversation> {
    const doc = await ConversationModel.create(data);
{{#if GROUP_CHAT}}
    const role = (userId: string) => (data.isGroup && userId === data.createdById ? 'admin' : 'member');
    await ConversationMemberModel.insertMany(memberIds.map(userId => ({ conversationId: doc._id, userId, role: role(userId) })));
{{else}}
    await ConversationMemberModel.insertMany(memberIds.map(userId => ({ conversationId: doc._id, userId })));
{{/if}}
    return toConversation(doc.toObject<ConversationDocument>());
  }

  async findConversation(id: string): Promise<Conversation | null> {
    if (!isValidId(id)) return null;
    const doc = await ConversationModel.findById(id).lean<ConversationDocument>();
    return doc ? toConversation(doc) : null;
  }
{{#if GROUP_CHAT}}

  async updateConversation(id: string, data: Partial<Pick<Conversation, 'title' | 'avatarUrl'>>): Promise<Conversation> {
    const doc = await ConversationModel.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after' }).lean<ConversationDocument>();
    if (!doc) throw new Error(`Conversation ${id} not found`);
    return toConversation(doc);
  }
{{/if}}

  async findDirectConversation(userId: string, otherUserId: string): Promise<Conversation | null> {
    const mine = await ConversationMemberModel.find({ userId }, { conversationId: 1 }).lean<MemberDocument[]>();
    const shared = await ConversationMemberModel.find({ userId: otherUserId, conversationId: { $in: mine.map(m => m.conversationId) } }, { conversationId: 1 }).lean<MemberDocument[]>();
    const doc = await ConversationModel.findOne({ _id: { $in: shared.map(m => m.conversationId) }{{#if GROUP_CHAT}}, isGroup: false{{/if}} }).lean<ConversationDocument>();
    return doc ? toConversation(doc) : null;
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    const memberships = await ConversationMemberModel.find({ userId }, { conversationId: 1 }).lean<MemberDocument[]>();
    const docs = await ConversationModel.find({ _id: { $in: memberships.map(m => m.conversationId) } })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .lean<ConversationDocument[]>();
    return docs.map(toConversation);
  }

  async deleteConversation(id: string): Promise<void> {
    await Promise.all([ConversationModel.deleteOne({ _id: id }), ConversationMemberModel.deleteMany({ conversationId: id }), MessageModel.deleteMany({ conversationId: id })]);
  }

  async listMembers(conversationIds: string[]): Promise<ConversationMember[]> {
    const valid = ids(conversationIds);
{{#if GROUP_CHAT}}
    if (!valid.length) return [];
    // Oldest member first – the next admin when the last one leaves.
    return (await ConversationMemberModel.find({ conversationId: { $in: valid } }).sort({ joinedAt: 1 }).lean<MemberDocument[]>()).map(toMember);
{{else}}
    return valid.length ? (await ConversationMemberModel.find({ conversationId: { $in: valid } }).lean<MemberDocument[]>()).map(toMember) : [];
{{/if}}
  }

  async findMember(conversationId: string, userId: string): Promise<ConversationMember | null> {
    if (!isValidId(conversationId) || !isValidId(userId)) return null;
    const doc = await ConversationMemberModel.findOne({ conversationId, userId }).lean<MemberDocument>();
    return doc ? toMember(doc) : null;
  }

  async updateMember(conversationId: string, userId: string, data: Partial<Pick<ConversationMember, 'lastReadAt' | 'clearedAt' | 'hidden'{{#if GROUP_CHAT}} | 'role'{{/if}}>>): Promise<void> {
    await ConversationMemberModel.updateOne({ conversationId, userId }, { $set: data });
  }

  async updateMemberships(userId: string, data: Partial<Pick<ConversationMember, 'clearedAt' | 'hidden'>>): Promise<void> {
    if (isValidId(userId)) await ConversationMemberModel.updateMany({ userId }, { $set: data });
  }
{{#if GROUP_CHAT}}

  async addMembers(conversationId: string, userIds: string[]): Promise<void> {
    // Existing members are left as they are.
    await ConversationMemberModel.bulkWrite(
      userIds.map(userId => ({
        updateOne: { filter: { conversationId: new Types.ObjectId(conversationId), userId: new Types.ObjectId(userId) }, update: { $setOnInsert: { role: 'member', joinedAt: new Date() } }, upsert: true },
      })),
    );
  }
{{/if}}

  async removeMember(conversationId: string, userId: string): Promise<void> {
    await ConversationMemberModel.deleteOne({ conversationId, userId });
  }

  async createMessage(data: CreateMessageData): Promise<Message> {
    const doc = await MessageModel.create(data);
    await ConversationModel.updateOne({ _id: data.conversationId }, { $set: { lastMessageAt: doc.createdAt } });
    return toMessage(doc.toObject<MessageDocument>());
  }

  async findMessage(id: string): Promise<Message | null> {
    if (!isValidId(id)) return null;
    const doc = await MessageModel.findById(id).lean<MessageDocument>();
    return doc ? toMessage(doc) : null;
  }

  async findMessages(messageIds: string[]): Promise<Message[]> {
    const valid = ids(messageIds);
    return valid.length ? (await MessageModel.find({ _id: { $in: valid } }).lean<MessageDocument[]>()).map(toMessage) : [];
  }

  async listMessages(conversationId: string, options: { after?: Date | null; before?: Pick<Message, 'createdAt' | 'id'>; limit: number }): Promise<Message[]> {
    const { after, before } = options;
    const docs = await MessageModel.find({
      conversationId,
      deletedAt: null,
      ...(after ? { createdAt: { $gt: after } } : {}),
      // Older than the cursor – messages of the same millisecond are ordered by id.
      ...(before ? { $or: [{ createdAt: { $lt: before.createdAt } }, { createdAt: before.createdAt, _id: { $lt: new Types.ObjectId(before.id) } }] } : {}),
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(options.limit)
      .lean<MessageDocument[]>();
    return docs.map(toMessage);
  }

  async lastMessages(conversationIds: string[]): Promise<Message[]> {
    const valid = ids(conversationIds);
    if (!valid.length) return [];
    const docs = await MessageModel.aggregate<MessageDocument>([
      { $match: { conversationId: { $in: valid }, deletedAt: null } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $group: { _id: '$conversationId', message: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$message' } },
    ]);
    return docs.map(toMessage);
  }

  countUnread(conversationId: string, userId: string, since: Date | null, after: Date | null): Promise<number> {
    const from = since && after ? (since > after ? since : after) : (since ?? after);
    return MessageModel.countDocuments({ conversationId, deletedAt: null, senderId: { $ne: userId }, type: { $ne: 'system' }, ...(from ? { createdAt: { $gt: from } } : {}) });
  }

  async softDeleteMessage(id: string): Promise<void> {
    await MessageModel.updateOne({ _id: id, deletedAt: null }, { $set: { deletedAt: new Date() } });
  }

  async updateMessageText(id: string, text: string): Promise<Message | null> {
    const doc = await MessageModel.findOneAndUpdate({ _id: id, deletedAt: null }, { $set: { text } }, { new: true }).lean<MessageDocument>();
    return doc ? toMessage(doc) : null;
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    await BlockedUserModel.updateOne({ blockerId, blockedId }, { $set: { blockerId, blockedId } }, { upsert: true });
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await BlockedUserModel.deleteOne({ blockerId, blockedId });
  }

  async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    const count = await BlockedUserModel.countDocuments({
      $or: [
        { blockerId: userAId, blockedId: userBId },
        { blockerId: userBId, blockedId: userAId },
      ],
    });
    return count > 0;
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    const docs = await BlockedUserModel.find({ blockerId: userId }).lean();
    return docs.map(d => d.blockedId.toString());
  }
}
