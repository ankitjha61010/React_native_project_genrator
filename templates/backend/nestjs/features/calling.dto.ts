import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class InitiateCallDto {
  @IsString()
  receiverId: string;

  @IsIn(['audio', 'video'])
  callType: 'audio' | 'video';
}

export class InitiateGroupCallDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participantIds: string[];

  @IsIn(['audio', 'video'])
  callType: 'audio' | 'video';
}

/** POST /calls/voip-token – the iOS app's PushKit token (the app usually sends no deviceId). */
export class RegisterVoipTokenDto {
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  voipToken: string;

  /** The install's device id – default: your most recently active iOS device. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  deviceId?: string;
}

export class CallHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
