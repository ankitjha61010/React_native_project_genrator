import type { DataSource, Repository } from 'typeorm';
import type { LegalSettings, LegalSettingsInput } from '{{IMPORT:domain.legal}}';
import type { LegalRepository } from '{{IMPORT:contract.legal}}';
import { LegalSettingsOrmEntity } from '{{IMPORT:typeorm.legal}}';

/** The single row. */
const ID = 'default';

const toSettings = ({ id: _id, ...settings }: LegalSettingsOrmEntity): LegalSettings => settings;

export class TypeOrmLegalRepository implements LegalRepository {
  private readonly rows: Repository<LegalSettingsOrmEntity>;

  constructor(dataSource: DataSource) {
    this.rows = dataSource.getRepository(LegalSettingsOrmEntity);
  }

  async find(): Promise<LegalSettings | null> {
    const row = await this.rows.findOneBy({ id: ID });
    return row && toSettings(row);
  }

  async save(input: LegalSettingsInput): Promise<LegalSettings> {
    const row = (await this.rows.findOneBy({ id: ID })) ?? this.rows.create({ id: ID });
    return toSettings(await this.rows.save(Object.assign(row, input)));
  }
}
