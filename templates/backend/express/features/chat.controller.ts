import type { Request, Response } from 'express';
import type { ChatService } from '{{IMPORT:app.chatService}}';
import { currentUser } from '{{IMPORT:ex.mw.auth}}';
import { sendSuccess } from '{{IMPORT:ex.respond}}';
import { uploadedFile } from '{{IMPORT:ex.mw.upload}}';
import { parseBody, parseParams, parseQuery } from '{{IMPORT:ex.validation}}';
import {
{{#if GROUP_CHAT}}
  addMembersSchema,
  createGroupSchema,
  memberParams,
  memberRoleSchema,
  updateGroupSchema,
{{/if}}
  conversationParams,
  listMessagesQuery,
  messageParams,
  sendMessageSchema,
  startConversationSchema,
} from '{{IMPORT:ex.chat.schemas}}';
import { CHAT_MESSAGES } from '{{IMPORT:messages.chat}}';

/** Handles `/chat` requests (the app's chatEndpoints.ts). Live events go through Socket.IO. */
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  /** GET /chat/conversations – newest activity first */
  listConversations = async (req: Request, res: Response) => {
    sendSuccess(res, CHAT_MESSAGES.conversations, await this.chat.listConversations(currentUser(req).id));
  };

  /** POST /chat/conversations – opens the direct chat with someone (reuses the existing one) */
  startConversation = async (req: Request, res: Response) => {
    sendSuccess(res, CHAT_MESSAGES.conversation, await this.chat.startConversation(currentUser(req).id, parseBody(startConversationSchema, req)));
  };

  /** GET /chat/conversations/:conversationId */
  getConversation = async (req: Request, res: Response) => {
    const { conversationId } = parseParams(conversationParams, req);
    sendSuccess(res, CHAT_MESSAGES.conversation, await this.chat.getConversation(currentUser(req).id, conversationId));
  };

  /** DELETE /chat/conversations/:conversationId – deletes a direct chat for you, or leaves a group */
  deleteConversation = async (req: Request, res: Response) => {
    const { conversationId } = parseParams(conversationParams, req);
    await this.chat.deleteConversation(currentUser(req).id, conversationId);
    sendSuccess(res, CHAT_MESSAGES.conversationDeleted);
  };

  /** POST /chat/conversations/:conversationId/clear – "Clear chat": empties it for you only (it stays in your list) */
  clearConversation = async (req: Request, res: Response) => {
    const { conversationId } = parseParams(conversationParams, req);
    await this.chat.clearConversation(currentUser(req).id, conversationId);
    sendSuccess(res, CHAT_MESSAGES.chatCleared);
  };

  /** POST /chat/conversations/clear – "Clear all chats": every conversation, for you only */
  clearAllConversations = async (req: Request, res: Response) => {
    await this.chat.clearAllConversations(currentUser(req).id);
    sendSuccess(res, CHAT_MESSAGES.allChatsCleared);
  };

  /** GET /chat/conversations/:conversationId/messages – oldest → newest; `before` loads older pages */
  listMessages = async (req: Request, res: Response) => {
    const { conversationId } = parseParams(conversationParams, req);
    const { items, hasMore } = await this.chat.listMessages(currentUser(req).id, conversationId, parseQuery(listMessagesQuery, req));
    sendSuccess(res, CHAT_MESSAGES.messages, items, { meta: { hasMore } });
  };

  /** POST /chat/conversations/:conversationId/messages – members get `chat:receive_message` */
  sendMessage = async (req: Request, res: Response) => {
    const { conversationId } = parseParams(conversationParams, req);
    const message = await this.chat.sendMessage(currentUser(req).id, conversationId, parseBody(sendMessageSchema, req));
    sendSuccess(res, CHAT_MESSAGES.messageSent, message, { status: 201 });
  };

  /** POST /chat/conversations/:conversationId/read – others get `chat:message_read` */
  markRead = async (req: Request, res: Response) => {
    const { conversationId } = parseParams(conversationParams, req);
    await this.chat.markRead(currentUser(req).id, conversationId);
    sendSuccess(res, CHAT_MESSAGES.markedRead);
  };

  /** DELETE /chat/conversations/:conversationId/messages/:messageId – for everyone */
  deleteMessage = async (req: Request, res: Response) => {
    const { conversationId, messageId } = parseParams(messageParams, req);
    await this.chat.deleteMessage(currentUser(req).id, conversationId, messageId);
    sendSuccess(res, CHAT_MESSAGES.messageDeleted);
  };

{{#if GROUP_CHAT}}
  /** POST /chat/groups – the creator becomes the group's admin */
  createGroup = async (req: Request, res: Response) => {
    sendSuccess(res, CHAT_MESSAGES.groupCreated, await this.chat.createGroup(currentUser(req).id, parseBody(createGroupSchema, req)), { status: 201 });
  };

  /** PATCH /chat/groups/:conversationId – name / image (admins) */
  updateGroup = async (req: Request, res: Response) => {
    const { conversationId } = parseParams(conversationParams, req);
    sendSuccess(res, CHAT_MESSAGES.groupUpdated, await this.chat.updateGroup(currentUser(req).id, conversationId, parseBody(updateGroupSchema, req)));
  };

  /** POST /chat/groups/:conversationId/members – add people (admins) */
  addMembers = async (req: Request, res: Response) => {
    const { conversationId } = parseParams(conversationParams, req);
    sendSuccess(res, CHAT_MESSAGES.membersAdded, await this.chat.addMembers(currentUser(req).id, conversationId, parseBody(addMembersSchema, req).userIds));
  };

  /** DELETE /chat/groups/:conversationId/members/:userId – remove someone (admins) */
  removeMember = async (req: Request, res: Response) => {
    const { conversationId, userId } = parseParams(memberParams, req);
    sendSuccess(res, CHAT_MESSAGES.memberRemoved, await this.chat.removeMember(currentUser(req).id, conversationId, userId));
  };

  /** PATCH /chat/groups/:conversationId/members/:userId – make admin / member (admins) */
  setMemberRole = async (req: Request, res: Response) => {
    const { conversationId, userId } = parseParams(memberParams, req);
    sendSuccess(res, CHAT_MESSAGES.roleChanged, await this.chat.setMemberRole(currentUser(req).id, conversationId, userId, parseBody(memberRoleSchema, req).role));
  };

  /** POST /chat/groups/:conversationId/leave – the last admin's role goes to the longest-standing member */
  leaveGroup = async (req: Request, res: Response) => {
    const { conversationId } = parseParams(conversationParams, req);
    await this.chat.leaveGroup(currentUser(req).id, conversationId);
    sendSuccess(res, CHAT_MESSAGES.leftGroup);
  };

{{/if}}
  /** POST /chat/upload (multipart field `file`) – photo, video, audio or document; then send its url */
  upload = async (req: Request, res: Response) => {
    sendSuccess(res, CHAT_MESSAGES.fileUploaded, await this.chat.uploadMedia(currentUser(req).id, uploadedFile(req, 'file')), { status: 201 });
  };

  /** POST /chat/upload-voice (multipart field `file`, audio only) */
  uploadVoice = async (req: Request, res: Response) => {
    sendSuccess(res, CHAT_MESSAGES.voiceNoteUploaded, await this.chat.uploadMedia(currentUser(req).id, uploadedFile(req, 'file'), true), { status: 201 });
  };
}
