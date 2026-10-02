import type { OTACheckResult, OTARelease } from '{{IMPORT:domain.ota}}';
import type { OTARepository } from '{{IMPORT:contract.ota}}';

export interface CheckUpdateInput {
  native_version: string;
  ota_version: number;
  platform: string;
  device_id?: string;
  ota_status?: string;
}

export interface DownloadEventInput {
  device_id: string;
  ota_version: number;
  event: string;
  platform?: string;
}

/** Simple deterministic string hashing for staged rollout bucketing (0-99) */
function getRolloutBucket(deviceId?: string): number {
  if (!deviceId) return 0;
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = (hash << 5) - hash + deviceId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

export class OTAService {
  constructor(private readonly repo: OTARepository) {}

  async checkUpdate(input: CheckUpdateInput): Promise<OTACheckResult> {
    const latest = await this.repo.findLatestActive(input.platform, input.native_version);
    if (!latest) {
      return { update_available: false };
    }

    // Check if the current version was rolled back by admin
    if (latest.status === 'rolled_back') {
      return { update_available: false, revert_to_embedded: true };
    }

    // Check version number
    if (latest.version <= input.ota_version) {
      return { update_available: false };
    }

    // Staged rollout check (e.g. 20% of devices)
    if (latest.targetRolloutPct < 100) {
      const bucket = getRolloutBucket(input.device_id);
      if (bucket >= latest.targetRolloutPct) {
        return { update_available: false };
      }
    }

    return {
      update_available: true,
      ota_version: latest.version,
      bundle_url: latest.bundleUrl,
      bundle_size: latest.bundleSize,
      sha256: latest.sha256,
      signature: latest.signature,
      force_update: latest.forceUpdate,
      release_notes: latest.releaseNotes ?? undefined,
    };
  }

  async recordDownloadEvent(input: DownloadEventInput): Promise<void> {
    await this.repo.recordEvent({
      deviceId: input.device_id,
      otaVersion: input.ota_version,
      event: input.event,
      platform: input.platform || 'unknown',
    });
    if (input.event === 'apply_success') {
      await this.repo.incrementDownloadCount(input.ota_version);
    }
  }

  listReleases(): Promise<OTARelease[]> {
    return this.repo.listReleases();
  }

  createRelease(data: Omit<OTARelease, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount'>): Promise<OTARelease> {
    return this.repo.createRelease(data);
  }

  rollbackRelease(id: string): Promise<OTARelease | null> {
    return this.repo.rollbackRelease(id);
  }
}
