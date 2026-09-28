import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
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
import { ChatMessageDto, ConversationDto, ListMessagesQueryDto, SendMessageDto, StartConversationDto, UploadedMediaDto } from '{{IMPORT:nest.chat.dto}}';

/** `/chat` – the endpoints of the app's chatEndpoints.ts. Live events: see the Socket.IO server. */
{{#if SWAGGER}}
@ApiTags('Chat')
{{/if}}
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('conversations')
  @Endpoint({ summary: 'Your conversations, newest activity first', message: 'Conversations', response: ConversationDto, array: true, errors: [401], bearer: true })
  list(@CurrentUser() user: User) {
    return this.chat.listConversations(user.id);
  }

  @Post('conversations')
  @Endpoint({ summary: 'Open a direct chat (reuses the existing one) or create a group', message: 'Conversation', status: 200, response: ConversationDto, errors: [400, 401, 404, 422], bearer: true })
  start(@CurrentUser() user: User, @Body() dto: StartConversationDto) {
    return this.chat.startConversation(user.id, dto);
  }

  @Get('conversations/:conversationId')
  @Endpoint({ summary: 'One conversation', message: 'Conversation', response: ConversationDto, errors: [401, 404], bearer: true })
  get(@CurrentUser() user: User, @Param('conversationId') conversationId: string) {
    return this.chat.getConversation(user.id, conversationId);
  }

  @Delete('conversations/:conversationId')
  @Endpoint({ summary: 'Delete a chat for you (direct) or leave a group', message: 'Conversation deleted', errors: [401, 404], bearer: true })
  async remove(@CurrentUser() user: User, @Param('conversationId') conversationId: string) {
    await this.chat.deleteConversation(user.id, conversationId);
  }

  @Get('conversations/:conversationId/messages')
  @Endpoint({ summary: 'Messages, oldest → newest (`before` loads older pages; meta.hasMore)', message: 'Messages', response: ChatMessageDto, array: true, errors: [401, 404, 422], bearer: true })
  async messages(@CurrentUser() user: User, @Param('conversationId') conversationId: string, @Query() query: ListMessagesQueryDto) {
    const { items, hasMore } = await this.chat.listMessages(user.id, conversationId, query);
    return new WithMeta(items, { hasMore });
  }

  @Post('conversations/:conversationId/messages')
  @Endpoint({ summary: 'Send a message (members get `chat:receive_message`)', message: 'Message sent', status: 201, response: ChatMessageDto, errors: [400, 401, 404, 422], bearer: true })
  send(@CurrentUser() user: User, @Param('conversationId') conversationId: string, @Body() dto: SendMessageDto) {
    return this.chat.sendMessage(user.id, conversationId, dto);
  }

  @Post('conversations/:conversationId/read')
  @Endpoint({ summary: 'Mark the conversation as read (others get `chat:message_read`)', message: 'Marked as read', status: 200, errors: [401, 404], bearer: true })
  async read(@CurrentUser() user: User, @Param('conversationId') conversationId: string) {
    await this.chat.markRead(user.id, conversationId);
  }

  @Delete('conversations/:conversationId/messages/:messageId')
  @Endpoint({ summary: 'Delete one of your messages for everyone', message: 'Message deleted', errors: [401, 403, 404], bearer: true })
  async deleteMessage(@CurrentUser() user: User, @Param('conversationId') conversationId: string, @Param('messageId') messageId: string) {
    await this.chat.deleteMessage(user.id, conversationId, messageId);
  }

  @Post('upload')
  @Upload('file')
  @Endpoint({ summary: 'Upload a photo, video, audio or document (multipart field `file`) – then send its url', message: 'File uploaded', status: 201, response: UploadedMediaDto, errors: [400, 401, 413, 422], bearer: true })
  upload(@CurrentUser() user: User, @UploadedFileOf('file') file: UploadedFile) {
    return this.chat.uploadMedia(user.id, file);
  }

  @Post('upload-voice')
  @Upload('file')
  @Endpoint({ summary: 'Upload a voice note (multipart field `file`, audio only)', message: 'Voice note uploaded', status: 201, response: UploadedMediaDto, errors: [400, 401, 413, 422], bearer: true })
  uploadVoice(@CurrentUser() user: User, @UploadedFileOf('file') file: UploadedFile) {
    return this.chat.uploadMedia(user.id, file, true);
  }
}
