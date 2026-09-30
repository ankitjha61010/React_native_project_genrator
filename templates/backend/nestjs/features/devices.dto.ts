import { IsString, MaxLength, MinLength } from 'class-validator';
import type { DeviceType } from '{{IMPORT:domain.device}}';

/** FCM rotated the token – the only device change the app sends outside sign-in. */
export class UpdateFcmTokenDto {
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  fcmToken: string;
}

// ── responses (documentation) ────────────────────────────────────────────────

export class DeviceDto {
  deviceId: string;
  deviceType: DeviceType;
  deviceModel: string | null;
  osVersion: string | null;
  appVersion: string | null;
  pushEnabled: boolean;
  lastActiveAt: string;
  createdAt: string;
}
