import { randomUUID } from 'node:crypto';
import type { OTADownloadEvent, OTARelease } from '{{IMPORT:domain.ota}}';
import type { OTARepository } from '{{IMPORT:contract.ota}}';
import type { PrismaClient } from '{{IMPORT:db.connection}}';

export class PrismaOTARepository implements OTARepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findLatestActive(platform: string, nativeVersion: string): Promise<OTARelease | null> {
    const record = await (this.prisma as any).otaRelease?.findFirst({
      where: {
        nativeVersion,
        platform: { in: [platform, 'all'] },
        status: 'active',
      },
      orderBy: { version: 'desc' },
    });
    return record ?? null;
  }

  async listReleases(): Promise<OTARelease[]> {
    const records = await (this.prisma as any).otaRelease?.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records ?? [];
  }

  async createRelease(data: Omit<OTARelease, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount'>): Promise<OTARelease> {
    const record = await (this.prisma as any).otaRelease?.create({
      data: {
        id: randomUUID(),
        ...data,
        downloadCount: 0,
      },
    });
    return record;
  }

  async rollbackRelease(id: string): Promise<OTARelease | null> {
    return (this.prisma as any).otaRelease?.update({
      where: { id },
      data: { status: 'rolled_back' },
    });
  }

  async recordEvent(event: Omit<OTADownloadEvent, 'id' | 'createdAt'>): Promise<void> {
    await (this.prisma as any).otaDownloadEvent?.create({
      data: {
        id: randomUUID(),
        ...event,
      },
    }).catch(() => undefined);
  }

  async incrementDownloadCount(otaVersion: number): Promise<void> {
    await (this.prisma as any).otaRelease?.updateMany({
      where: { version: otaVersion },
      data: { downloadCount: { increment: 1 } },
    }).catch(() => undefined);
  }
}
