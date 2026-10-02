import { z } from 'zod';
import { {{#if GROUP_CHAT}}MEMBER_ROLES, {{/if}}MESSAGE_TYPES, SystemEvent } from '{{IMPORT:domain.chat}}';

export const conversationParams = z.object({ conversationId: z.string().min(1).max(64) });
export const messageParams = conversationParams.extend({ messageId: z.string().min(1).max(64) });

export const startConversationSchema = z
  .object({ participantIds: z.array(z.string().min(1).max(64)).length(1).meta({ description: 'The other person' }) })
  .meta({ id: 'StartConversationRequest' });
{{#if GROUP_CHAT}}

const userIds = z.array(z.string().min(1).max(64)).min(1).max(256);

export const memberParams = conversationParams.extend({ userId: z.string().min(1).max(64) });
export const userParams = z.object({ userId: z.string().min(1).max(64) });

export const createGroupSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    participantIds: userIds,
    avatarUrl: z.url().max(1024).nullable().optional().meta({ description: 'Upload the image first (POST /chat/upload)' }),
  })
  .meta({ id: 'CreateGroupRequest' });

export const updateGroupSchema = z
  .object({ title: z.string().trim().min(1).max(120).optional(), avatarUrl: z.url().max(1024).nullable().optional() })
  .meta({ id: 'UpdateGroupRequest' });

export const addMembersSchema = z.object({ userIds }).meta({ id: 'AddMembersRequest' });

export const memberRoleSchema = z.object({ role: z.enum(MEMBER_ROLES) }).meta({ id: 'MemberRoleRequest' });
{{/if}}

const cropSchema = z
  .object({
    width: z.number().positive(),
    height: z.number().positive(),
    aspectRatio: z.string().max(20),
    rotation: z.number().optional(),
    filter: z.enum(['normal', 'warm', 'cool', 'mono']).optional(),
    outputWidth: z.number().positive().optional(),
    outputHeight: z.number().positive().optional(),
  })
  .meta({ id: 'MediaCrop' });

/** Same fields as the app's ChatMessage (media must be uploaded first – send the returned url). */
export const sendMessageSchema = z
  .object({
    type: z.enum(MESSAGE_TYPES),
    text: z.string().max(10_000).optional(),
    mediaUrl: z.url().max(1024).optional(),
    thumbnailUrl: z.url().max(1024).optional(),
    fileName: z.string().max(255).optional(),
    fileSize: z.string().max(32).optional(),
    duration: z.number().int().min(0).max(86_400).optional(),
    crop: cropSchema.optional(),
    replyToId: z.string().min(1).max(64).optional().meta({ description: 'Reply: the id of the quoted message (same conversation)' }),
  })
  .meta({ id: 'SendMessageRequest' });

export const listMessagesQuery = z.object({
  before: z.string().max(64).optional().meta({ description: 'Id of the oldest message already loaded' }),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// ── responses (used by the OpenAPI document) ──────────────────────────────────

const person = z.object({ id: z.string(), name: z.string() });

const replyToSchema = z
  .object({
    messageId: z.string(),
    senderId: z.string(),
    senderName: z.string(),
    type: z.enum([...MESSAGE_TYPES, 'system']),
    text: z.string().optional(),
    deleted: z.literal(true).optional().meta({ description: 'The quoted message was deleted' }),
  })
  .meta({ id: 'ReplyTo' });

export const chatMessageSchema = z
  .object({
    id: z.string(),
    conversationId: z.string(),
    senderId: z.string(),
    senderName: z.string(),
    senderAvatar: z.url().optional(),
    type: z.enum([...MESSAGE_TYPES, 'system']),
    text: z.string().optional(),
    mediaUrl: z.url().optional(),
    thumbnailUrl: z.url().optional(),
    fileName: z.string().optional(),
    fileSize: z.string().optional(),
    duration: z.number().optional(),
    crop: cropSchema.optional(),
    event: z.enum(SystemEvent).optional().meta({ description: '`system` messages: what happened – rendered by the app ("Jane added John")' }),
    actor: person.optional().meta({ description: '`system` messages: who did it' }),
    target: person.optional().meta({ description: '`system` messages: who it happened to' }),
    replyTo: replyToSchema.optional(),
    createdAt: z.iso.datetime(),
    status: z.enum(['sent', 'read']),
    isMe: z.boolean().optional(),
  })
  .meta({ id: 'ChatMessage' });

export const conversationSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    avatar: z.url().optional(),
{{#if GROUP_CHAT}}
    isGroup: z.boolean(),
    myRole: z.enum(MEMBER_ROLES),
{{/if}}
    unreadCount: z.number(),
    lastMessage: chatMessageSchema.optional(),
    participants: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        avatar: z.url().optional(),
        isOnline: z.boolean(),
        lastSeen: z.iso.datetime().optional(),
{{#if GROUP_CHAT}}
        role: z.enum(MEMBER_ROLES),
{{/if}}
      }),
    ),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'Conversation' });

export const blockedUserSchema = z
  .object({ id: z.string(), name: z.string(), avatar: z.url().optional() })
  .meta({ id: 'BlockedUser' });

export const uploadedMediaSchema = z
  .object({ url: z.url(), type: z.enum(MESSAGE_TYPES), fileName: z.string(), fileSize: z.string(), mimeType: z.string() })
  .meta({ id: 'UploadedMedia' });
