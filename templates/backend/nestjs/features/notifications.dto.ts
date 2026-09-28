import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { BROADCAST_AUDIENCES, DEVICE_PLATFORMS, NOTIFICATION_TYPES, type BroadcastAudience, type DevicePlatform, type NotificationData, type NotificationType } from '{{IMPORT:domain.notification}}';

export class RegisterDeviceDto {
  /** FCM registration token. */
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  token: string;

  @IsIn(DEVICE_PLATFORMS)
  platform: DevicePlatform;
}

export class BroadcastDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body: string;

  @IsOptional()
  @IsIn(NOTIFICATION_TYPES)
  type?: NotificationType;

  @IsOptional()
  @IsIn(BROADCAST_AUDIENCES)
  audience?: BroadcastAudience;

  /** Extra string values for the app, e.g. { "url": "https://…" }. */
  @IsOptional()
  @IsObject()
  data?: NotificationData;
}

// ── responses (documentation) ────────────────────────────────────────────────

export class NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
  read: boolean;
  createdAt: string;
}

export class BroadcastResponseDto {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  audience: BroadcastAudience;
  recipientCount: number;
  createdAt: string;
}

export class CountDto {
  count: number;
}
