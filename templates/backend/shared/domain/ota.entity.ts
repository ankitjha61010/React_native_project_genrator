export type OTAPlatform = 'ios' | 'android' | 'all';
export type OTAReleaseStatus = 'active' | 'rolled_back' | 'draft';

export interface OTARelease {
  id: string;
  version: number;
  nativeVersion: string;
  platform: OTAPlatform;
  bundleUrl: string;
  bundleSize: number;
  sha256: string;
  signature: string;
  forceUpdate: boolean;
  releaseNotes: string | null;
  targetRolloutPct: number;
  status: OTAReleaseStatus;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OTADownloadEvent {
  id: string;
  deviceId: string;
  otaVersion: number;
  event: string;
  platform: string;
  createdAt: Date;
}

export interface OTACheckResult {
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
