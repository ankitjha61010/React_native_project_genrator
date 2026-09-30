import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUrl, Max, MaxLength, Min, {{#if GROUP_CHAT}}MinLength, {{/if}}ValidateNested } from 'class-validator';
import { {{#if GROUP_CHAT}}MEMBER_ROLES, type MemberRole, {{/if}}MESSAGE_TYPES, type MessageType, type SendableMessageType, type SystemEvent } from '{{IMPORT:domain.chat}}';

export class StartConversationDto {
  /** The other person. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @IsString({ each: true })
  participantIds: string[];
}
{{#if GROUP_CHAT}}

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(256)
  @IsString({ each: true })
  participantIds: string[];

  /** Upload the image first (POST /chat/upload). */
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1024)
  avatarUrl?: string | null;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1024)
  avatarUrl?: string | null;
}

export class AddMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(256)
  @IsString({ each: true })
  userIds: string[];
}

export class MemberRoleDto {
  @IsIn(MEMBER_ROLES)
  role: MemberRole;
}
{{/if}}

export class MediaCropDto {
  @IsNumber()
  @IsPositive()
  width: number;

  @IsNumber()
  @IsPositive()
  height: number;

  @IsString()
  @MaxLength(20)
  aspectRatio: string;

  @IsOptional()
  @IsNumber()
  rotation?: number;

  @IsOptional()
  @IsIn(['normal', 'warm', 'cool', 'mono'])
  filter?: 'normal' | 'warm' | 'cool' | 'mono';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  outputWidth?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  outputHeight?: number;
}

/** Same fields as the app's ChatMessage (media must be uploaded first – send the returned url). */
export class SendMessageDto {
  @IsIn(MESSAGE_TYPES)
  type: SendableMessageType;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  text?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1024)
  mediaUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1024)
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  fileSize?: string;

  /** Seconds (audio / video). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86_400)
  duration?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaCropDto)
  crop?: MediaCropDto;

  /** Reply: the id of the quoted message (same conversation). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  replyToId?: string;
}

export class ListMessagesQueryDto {
  /** Id of the oldest message already loaded. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  before?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 30;
}

// ── responses (documentation) ────────────────────────────────────────────────

export class ChatPersonDto {
  id: string;
  name: string;
}

/** The quoted message above a reply. */
export class ReplyToDto {
  messageId: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  text?: string;
  /** The quoted message was deleted. */
  deleted?: true;
}

export class ChatMessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: string;
  duration?: number;
  crop?: MediaCropDto;
  /** `system` messages: what happened – rendered by the app ("Jane added John"). */
  event?: SystemEvent;
  actor?: ChatPersonDto;
  target?: ChatPersonDto;
  replyTo?: ReplyToDto;
  createdAt: string;
  status: 'sent' | 'read';
  isMe?: boolean;
}

export class ChatParticipantDto {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
{{#if GROUP_CHAT}}
  role: MemberRole;
{{/if}}
}

export class ConversationDto {
  id: string;
  title: string;
  avatar?: string;
{{#if GROUP_CHAT}}
  isGroup: boolean;
  myRole: MemberRole;
{{/if}}
  unreadCount: number;
  lastMessage?: ChatMessageDto;
  participants: ChatParticipantDto[];
  updatedAt: string;
}

export class UploadedMediaDto {
  url: string;
  type: SendableMessageType;
  fileName: string;
  fileSize: string;
  mimeType: string;
}
