import { z } from 'zod';
import type { ApiDocGroup } from '{{IMPORT:ex.docs.helpers}}';
import {
{{#if GROUP_CHAT}}
  addMembersSchema,
  createGroupSchema,
  memberParams,
  memberRoleSchema,
  updateGroupSchema,
{{/if}}
  chatMessageSchema,
  conversationParams,
  conversationSchema,
  listMessagesQuery,
  messageParams,
  sendMessageSchema,
  startConversationSchema,
  uploadedMediaSchema,
} from '{{IMPORT:ex.chat.schemas}}';

/** Swagger docs of chat.routes.ts. Live events: see the Socket.IO server. */
export const chatDocs: ApiDocGroup = {
  tag: 'Chat',
  endpoints: [
    { method: 'get', path: '/chat/conversations', summary: 'Your conversations, newest activity first', auth: true, response: z.array(conversationSchema), errors: [401] },
    { method: 'post', path: '/chat/conversations', summary: 'Open the direct chat with someone (reuses the existing one)', auth: true, body: startConversationSchema, response: conversationSchema, errors: [400, 401, 404, 422] },
    { method: 'get', path: '/chat/conversations/:conversationId', summary: 'One conversation', auth: true, params: conversationParams, response: conversationSchema, errors: [401, 404] },
    { method: 'delete', path: '/chat/conversations/:conversationId', summary: 'Delete a chat for you{{#if GROUP_CHAT}} (a group: leave it){{/if}}', auth: true, params: conversationParams, errors: [401, 404] },
    { method: 'get', path: '/chat/conversations/:conversationId/messages', summary: 'Messages, oldest → newest (`before` loads older pages; meta.hasMore)', auth: true, params: conversationParams, query: listMessagesQuery, response: z.array(chatMessageSchema), errors: [401, 404, 422] },
    { method: 'post', path: '/chat/conversations/:conversationId/messages', summary: 'Send a message (members get `chat:receive_message`)', status: 201, auth: true, params: conversationParams, body: sendMessageSchema, response: chatMessageSchema, errors: [400, 401, 404, 422] },
    { method: 'post', path: '/chat/conversations/:conversationId/read', summary: 'Mark the conversation as read (others get `chat:message_read`)', auth: true, params: conversationParams, errors: [401, 404] },
    { method: 'post', path: '/chat/conversations/:conversationId/clear', summary: 'Clear chat – hides its messages for you only (the others keep theirs); it stays in your list', auth: true, params: conversationParams, errors: [401, 404] },
    { method: 'post', path: '/chat/conversations/clear', summary: 'Clear all chats – every conversation, for you only', auth: true, errors: [401] },
    { method: 'delete', path: '/chat/conversations/:conversationId/messages/:messageId', summary: 'Delete one of your messages for everyone', auth: true, params: messageParams, errors: [401, 403, 404] },
{{#if GROUP_CHAT}}
    { method: 'post', path: '/chat/groups', summary: 'Create a group (you become its admin; members get `chat:conversation_updated`)', status: 201, auth: true, body: createGroupSchema, response: conversationSchema, errors: [400, 401, 404, 422] },
    { method: 'patch', path: '/chat/groups/:conversationId', summary: 'Change the group name / image – admins', auth: true, params: conversationParams, body: updateGroupSchema, response: conversationSchema, errors: [400, 401, 403, 404, 422] },
    { method: 'post', path: '/chat/groups/:conversationId/members', summary: 'Add members – admins', auth: true, params: conversationParams, body: addMembersSchema, response: conversationSchema, errors: [400, 401, 403, 404, 422] },
    { method: 'delete', path: '/chat/groups/:conversationId/members/:userId', summary: 'Remove a member – admins (they get `chat:conversation_removed`)', auth: true, params: memberParams, response: conversationSchema, errors: [400, 401, 403, 404] },
    { method: 'patch', path: '/chat/groups/:conversationId/members/:userId', summary: 'Make a member admin, or an admin member – admins', auth: true, params: memberParams, body: memberRoleSchema, response: conversationSchema, errors: [400, 401, 403, 404, 422] },
    { method: 'post', path: '/chat/groups/:conversationId/leave', summary: 'Leave the group (the last admin hands over to the longest-standing member)', auth: true, params: conversationParams, errors: [400, 401, 404] },
{{/if}}
    { method: 'post', path: '/chat/upload', summary: 'Upload a photo, video, audio or document (multipart field `file`) – then send its url', status: 201, auth: true, upload: 'file', response: uploadedMediaSchema, errors: [400, 401, 413, 422] },
    { method: 'post', path: '/chat/upload-voice', summary: 'Upload a voice note (multipart field `file`, audio only)', status: 201, auth: true, upload: 'file', response: uploadedMediaSchema, errors: [400, 401, 413, 422] },
  ],
};
