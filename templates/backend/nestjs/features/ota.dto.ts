import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class CheckUpdateQueryDto {
  @IsString()
  native_version: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ota_version?: number;

  @IsString()
  platform: string;

  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @IsString()
  ota_status?: string;
}

export class DownloadEventDto {
  @IsString()
  device_id: string;

  @Type(() => Number)
  @IsNumber()
  ota_version: number;

  @IsString()
  event: string;

  @IsOptional()
  @IsString()
  platform?: string;
}

export class CreateReleaseDto {
  @IsString()
  nativeVersion: string;

  @IsNumber()
  @Min(1)
  otaVersion: number;

  @IsEnum(['ios', 'android', 'all'])
  platform: 'ios' | 'android' | 'all';

  @IsUrl({ require_tld: false })
  bundleUrl: string;

  @IsNumber()
  bundleSize: number;

  @IsString()
  sha256: string;

  @IsString()
  signature: string;

  @IsBoolean()
  forceUpdate: boolean;

  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  targetRolloutPct?: number;
}

// ── responses (documentation) ────────────────────────────────────────────────

export class OtaCheckResultDto {
  update_available: boolean;
  ota_version?: number;
  bundle_url?: string;
  bundle_size?: number;
  sha256?: string;
  signature?: string;
  force_update?: boolean;
  release_notes?: string;
  revert_to_embedded?: boolean;
}

export class OtaReleaseDto {
  id: string;
  version: number;
  nativeVersion: string;
  platform: 'ios' | 'android' | 'all';
  bundleUrl: string;
  bundleSize: number;
  sha256: string;
  signature: string;
  forceUpdate: boolean;
  releaseNotes: string | null;
  targetRolloutPct: number;
  status: 'active' | 'rolled_back' | 'draft';
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}
