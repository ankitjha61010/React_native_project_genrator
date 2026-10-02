import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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
