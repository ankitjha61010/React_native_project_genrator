export interface OTAUpdateInfo {
  update_available?: boolean;
  force_update?: boolean;
  is_rollback?: boolean;
  store_update_required?: boolean;
  revert_to_embedded?: boolean;
  ota_version?: number;
  bundle_size?: number;
  bundle_url?: string;
  release_notes?: string;
  sha256?: string;
  signature?: string;
  [key: string]: unknown;
}

export interface OTAMetadata {
  ota_version: number;
  status: string;
  native_version?: string;
  applied_at?: string;
  rolled_back_at?: string;
  sha256?: string;
}

export interface DownloadProgress {
  progress: number;
  bytesWritten: number;
  contentLength: number;
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
  allowCellular?: boolean;
  jobIdRef?: { current: number | null };
}

export interface OTAError extends Error {
  code?: string;
}

export type OTAStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'verifying'
  | 'applying'
  | 'ready'
  | 'error'
  | 'up_to_date';
