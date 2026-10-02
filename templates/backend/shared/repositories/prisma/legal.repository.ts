import type { LegalSettings, LegalSettingsInput } from '{{IMPORT:domain.legal}}';
import type { LegalRepository } from '{{IMPORT:contract.legal}}';
import type { PrismaClient } from '{{IMPORT:db.connection}}';

/** The single row. */
const ID = 'default';

const toSettings = ({ id: _id, ...settings }: LegalSettings & { id: string }): LegalSettings => settings;

export class PrismaLegalRepository implements LegalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async find(): Promise<LegalSettings | null> {
    const row = await this.prisma.legalSettings.findUnique({ where: { id: ID } });
    return row && toSettings(row);
  }

  async save(input: LegalSettingsInput): Promise<LegalSettings> {
    return toSettings(await this.prisma.legalSettings.upsert({ where: { id: ID }, create: { id: ID, ...input }, update: input }));
  }
}
