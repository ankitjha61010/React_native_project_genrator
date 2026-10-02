import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const conversationSchema = new Schema(
  {
{{#if GROUP_CHAT}}
    title: { type: String, default: null, maxlength: 120 },
    isGroup: { type: Boolean, required: true, default: false },
    avatarUrl: { type: String, default: null, maxlength: 1024 },
{{/if}}
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'conversations' },
);

export type ConversationDocument = InferSchemaType<typeof conversationSchema> & { _id: Types.ObjectId; createdById: Types.ObjectId; createdAt: Date; updatedAt: Date };
export const ConversationModel = model('Conversation', conversationSchema);

const memberSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
{{#if GROUP_CHAT}}
    role: { type: String, required: true, default: 'member', maxlength: 16 },
{{/if}}
    lastReadAt: { type: Date, default: null },
    clearedAt: { type: Date, default: null },
    // "Delete chat": out of the list until a new message arrives.
    hidden: { type: Boolean, required: true, default: false },
    joinedAt: { type: Date, required: true, default: Date.now },
  },
  { collection: 'conversation_members' },
);
memberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

export type MemberDocument = InferSchemaType<typeof memberSchema> & { conversationId: Types.ObjectId; userId: Types.ObjectId };
export const ConversationMemberModel = model('ConversationMember', memberSchema);

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, maxlength: 16 },
    text: { type: String, default: null },
    mediaUrl: { type: String, default: null, maxlength: 1024 },
    thumbnailUrl: { type: String, default: null, maxlength: 1024 },
    fileName: { type: String, default: null, maxlength: 255 },
    fileSize: { type: String, default: null, maxlength: 32 },
    duration: { type: Number, default: null },
    crop: { type: Schema.Types.Mixed, default: null },
    // `system` messages: what happened (SystemEvent) and to whom.
    event: { type: String, default: null, maxlength: 32 },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // The message this one replies to.
    replyToId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'messages' },
);
messageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });

export type MessageDocument = InferSchemaType<typeof messageSchema> & { _id: Types.ObjectId; conversationId: Types.ObjectId; senderId: Types.ObjectId; targetUserId: Types.ObjectId | null; replyToId: Types.ObjectId | null; createdAt: Date };
export const MessageModel = model('Message', messageSchema);

const blockedUserSchema = new Schema(
  {
    blockerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blockedId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'blocked_users' },
);
blockedUserSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export type BlockedUserDocument = InferSchemaType<typeof blockedUserSchema> & { _id: Types.ObjectId; blockerId: Types.ObjectId; blockedId: Types.ObjectId; createdAt: Date };
export const BlockedUserModel = model('BlockedUser', blockedUserSchema);
