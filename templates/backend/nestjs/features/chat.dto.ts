import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUrl, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { MESSAGE_TYPES, type MessageType } from '{{IMPORT:domain.chat}}';

export class StartConversationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  participantIds: string[];

  /** Groups only. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;
}

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
  type: MessageType;

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
}

export class ConversationDto {
  id: string;
  title: string;
  avatar?: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessage?: ChatMessageDto;
  participants: ChatParticipantDto[];
  updatedAt: string;
}

export class UploadedMediaDto {
  url: string;
  type: MessageType;
  fileName: string;
  fileSize: string;
  mimeType: string;
}
