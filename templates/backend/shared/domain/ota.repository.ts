import type { OTADownloadEvent, OTARelease } from '{{IMPORT:domain.ota}}';

export interface OTARepository {
  findLatestActive(platform: string, nativeVersion: string): Promise<OTARelease | null>;
  listReleases(): Promise<OTARelease[]>;
  createRelease(data: Omit<OTARelease, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount'>): Promise<OTARelease>;
  rollbackRelease(id: string): Promise<OTARelease | null>;
  recordEvent(event: Omit<OTADownloadEvent, 'id' | 'createdAt'>): Promise<void>;
  incrementDownloadCount(otaVersion: number): Promise<void>;
}
