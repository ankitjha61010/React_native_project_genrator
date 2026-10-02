import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { OTADownloadEvent, OTARelease } from '{{IMPORT:domain.ota}}';
import type { OTARepository } from '{{IMPORT:contract.ota}}';

export class TypeOrmOTARepository implements OTARepository {
  private releases: OTARelease[] = [];
  private events: OTADownloadEvent[] = [];

  constructor(_dataSource?: DataSource) {}

  async findLatestActive(platform: string, nativeVersion: string): Promise<OTARelease | null> {
    const matching = this.releases
      .filter(r => r.status === 'active' && r.nativeVersion === nativeVersion && (r.platform === platform || r.platform === 'all'))
      .sort((a, b) => b.version - a.version);
    return matching[0] ?? null;
  }

  async listReleases(): Promise<OTARelease[]> {
    return [...this.releases].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createRelease(data: Omit<OTARelease, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount'>): Promise<OTARelease> {
    const now = new Date();
    const release: OTARelease = {
      id: randomUUID(),
      ...data,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.releases.push(release);
    return release;
  }

  async rollbackRelease(id: string): Promise<OTARelease | null> {
    const r = this.releases.find(rel => rel.id === id);
    if (!r) return null;
    r.status = 'rolled_back';
    r.updatedAt = new Date();
    return r;
  }

  async recordEvent(event: Omit<OTADownloadEvent, 'id' | 'createdAt'>): Promise<void> {
    this.events.push({
      id: randomUUID(),
      ...event,
      createdAt: new Date(),
    });
  }

  async incrementDownloadCount(otaVersion: number): Promise<void> {
    const r = this.releases.find(rel => rel.version === otaVersion);
    if (r) r.downloadCount += 1;
  }
}
