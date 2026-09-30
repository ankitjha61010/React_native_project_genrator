import { Body, Controller, Delete, Get, Param, {{#if GROUP_CHAT}}Patch, {{/if}}Post, Query } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiTags } from '@nestjs/swagger';
{{/if}}
import { ChatService } from '{{IMPORT:app.chatService}}';
import type { User } from '{{IMPORT:domain.user}}';
import type { UploadedFile } from '{{IMPORT:port.fileStorage}}';
import { CurrentUser } from '{{IMPORT:nest.decorators}}';
import { Endpoint } from '{{IMPORT:nest.endpoint}}';
import { WithMeta } from '{{IMPORT:nest.interceptor}}';
import { Upload, UploadedFileOf } from '{{IMPORT:nest.upload}}';
import { {{#if GROUP_CHAT}}AddMembersDto, CreateGroupDto, MemberRoleDto, UpdateGroupDto, {{/if}}ChatMessageDto, ConversationDto, ListMessagesQueryDto, SendMessageDto, StartConversationDto, UploadedMediaDto } from '{{IMPORT:nest.chat.dto}}';
import { CHAT_MESSAGES } from '{{IMPORT:messages.chat}}';

/** `/chat` – the endpoints of the app's chatEndpoints.ts. Live events: see the Socket.IO server. */
{{#if SWAGGER}}
@ApiTags('Chat')
{{/if}}
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('conversations')
  @Endpoint({ summary: 'Your conversations, newest activity first', message: CHAT_MESSAGES.conversations, response: ConversationDto, array: true, errors: [401], bearer: true })
  list(@CurrentUser() user: User) {
    return this.chat.listConversations(user.id);
  }

  @Post('conversations')
  @Endpoint({ summary: 'Open the direct chat with someone (reuses the existing one)', message: CHAT_MESSAGES.conversation, status: 200, response: ConversationDto, errors: [400, 401, 404, 422], bearer: true })
  start(@CurrentUser() user: User, @Body() dto: StartConversationDto) {
    return this.chat.startConversation(user.id, dto);
  }

  // Before `conversations/:conversationId` routes – "clear" is not an id.
  @Post('conversations/clear')
  @Endpoint({ summary: 'Clear all chats – every conversation, for you only', message: CHAT_MESSAGES.allChatsCleared, status: 200, errors: [401], bearer: true })
  async clearAll(@CurrentUser() user: User) {
    await this.chat.clearAllConversations(user.id);
  }

  @Get('conversations/:conversationId')
  @Endpoint({ summary: 'One conversation', message: CHAT_MESSAGES.conversation, response: ConversationDto, errors: [401, 404], bearer: true })
  get(@CurrentUser() user: User, @Param('conversationId') conversationId: string) {
    return this.chat.getConversation(user.id, conversationId);
  }

  @Delete('conversations/:conversationId')
  @Endpoint({ summary: 'Delete a chat for you{{#if GROUP_CHAT}} (a group: leave it){{/if}}', message: CHAT_MESSAGES.conversationDeleted, errors: [401, 404], bearer: true })
  async remove(@CurrentUser() user: User, @Param('conversationId') conversationId: string) {
    await this.chat.deleteConversation(user.id, conversationId);
  }

  @Get('conversations/:conversationId/messages')
  @Endpoint({ summary: 'Messages, oldest → newest (`before` loads older pages; meta.hasMore)', message: CHAT_MESSAGES.messages, response: ChatMessageDto, array: true, errors: [401, 404, 422], bearer: true })
  async messages(@CurrentUser() user: User, @Param('conversationId') conversationId: string, @Query() query: ListMessagesQueryDto) {
    const { items, hasMore } = await this.chat.listMessages(user.id, conversationId, query);
    return new WithMeta(items, { hasMore });
  }

  @Post('conversations/:conversationId/messages')
  @Endpoint({ summary: 'Send a message (members get `chat:receive_message`)', message: CHAT_MESSAGES.messageSent, status: 201, response: ChatMessageDto, errors: [400, 401, 404, 422], bearer: true })
  send(@CurrentUser() user: User, @Param('conversationId') conversationId: string, @Body() dto: SendMessageDto) {
    return this.chat.sendMessage(user.id, conversationId, dto);
  }

  @Post('conversations/:conversationId/read')
  @Endpoint({ summary: 'Mark the conversation as read (others get `chat:message_read`)', message: CHAT_MESSAGES.markedRead, status: 200, errors: [401, 404], bearer: true })
  async read(@CurrentUser() user: User, @Param('conversationId') conversationId: string) {
    await this.chat.markRead(user.id, conversationId);
  }

  @Post('conversations/:conversationId/clear')
  @Endpoint({ summary: 'Clear chat – hides its messages for you only (the others keep theirs); it stays in your list', message: CHAT_MESSAGES.chatCleared, status: 200, errors: [401, 404], bearer: true })
  async clear(@CurrentUser() user: User, @Param('conversationId') conversationId: string) {
    await this.chat.clearConversation(user.id, conversationId);
  }

  @Delete('conversations/:conversationId/messages/:messageId')
  @Endpoint({ summary: 'Delete one of your messages for everyone', message: CHAT_MESSAGES.messageDeleted, errors: [401, 403, 404], bearer: true })
  async deleteMessage(@CurrentUser() user: User, @Param('conversationId') conversationId: string, @Param('messageId') messageId: string) {
    await this.chat.deleteMessage(user.id, conversationId, messageId);
  }

{{#if GROUP_CHAT}}
  @Post('groups')
  @Endpoint({ summary: 'Create a group (you become its admin; members get `chat:conversation_updated`)', message: CHAT_MESSAGES.groupCreated, status: 201, response: ConversationDto, errors: [400, 401, 404, 422], bearer: true })
  createGroup(@CurrentUser() user: User, @Body() dto: CreateGroupDto) {
    return this.chat.createGroup(user.id, dto);
  }

  @Patch('groups/:conversationId')
  @Endpoint({ summary: 'Change the group name / image – admins', message: CHAT_MESSAGES.groupUpdated, response: ConversationDto, errors: [400, 401, 403, 404, 422], bearer: true })
  updateGroup(@CurrentUser() user: User, @Param('conversationId') conversationId: string, @Body() dto: UpdateGroupDto) {
    return this.chat.updateGroup(user.id, conversationId, dto);
  }

  @Post('groups/:conversationId/members')
  @Endpoint({ summary: 'Add members – admins', message: CHAT_MESSAGES.membersAdded, status: 200, response: ConversationDto, errors: [400, 401, 403, 404, 422], bearer: true })
  addMembers(@CurrentUser() user: User, @Param('conversationId') conversationId: string, @Body() dto: AddMembersDto) {
    return this.chat.addMembers(user.id, conversationId, dto.userIds);
  }

  @Delete('groups/:conversationId/members/:userId')
  @Endpoint({ summary: 'Remove a member – admins (they get `chat:conversation_removed`)', message: CHAT_MESSAGES.memberRemoved, response: ConversationDto, errors: [400, 401, 403, 404], bearer: true })
  removeMember(@CurrentUser() user: User, @Param('conversationId') conversationId: string, @Param('userId') memberId: string) {
    return this.chat.removeMember(user.id, conversationId, memberId);
  }

  @Patch('groups/:conversationId/members/:userId')
  @Endpoint({ summary: 'Make a member admin, or an admin member – admins', message: CHAT_MESSAGES.roleChanged, response: ConversationDto, errors: [400, 401, 403, 404, 422], bearer: true })
  setMemberRole(@CurrentUser() user: User, @Param('conversationId') conversationId: string, @Param('userId') memberId: string, @Body() dto: MemberRoleDto) {
    return this.chat.setMemberRole(user.id, conversationId, memberId, dto.role);
  }

  @Post('groups/:conversationId/leave')
  @Endpoint({ summary: 'Leave the group (the last admin hands over to the longest-standing member)', message: CHAT_MESSAGES.leftGroup, status: 200, errors: [400, 401, 404], bearer: true })
  async leaveGroup(@CurrentUser() user: User, @Param('conversationId') conversationId: string) {
    await this.chat.leaveGroup(user.id, conversationId);
  }

{{/if}}
  @Post('upload')
  @Upload('file')
  @Endpoint({ summary: 'Upload a photo, video, audio or document (multipart field `file`) – then send its url', message: CHAT_MESSAGES.fileUploaded, status: 201, response: UploadedMediaDto, errors: [400, 401, 413, 422], bearer: true })
  upload(@CurrentUser() user: User, @UploadedFileOf('file') file: UploadedFile) {
    return this.chat.uploadMedia(user.id, file);
  }

  @Post('upload-voice')
  @Upload('file')
  @Endpoint({ summary: 'Upload a voice note (multipart field `file`, audio only)', message: CHAT_MESSAGES.voiceNoteUploaded, status: 201, response: UploadedMediaDto, errors: [400, 401, 413, 422], bearer: true })
  uploadVoice(@CurrentUser() user: User, @UploadedFileOf('file') file: UploadedFile) {
    return this.chat.uploadMedia(user.id, file, true);
  }
}
