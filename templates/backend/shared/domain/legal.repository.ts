import type { LegalSettings, LegalSettingsInput } from '{{IMPORT:domain.legal}}';

/** The legal settings are a single record. */
export interface LegalRepository {
  find(): Promise<LegalSettings | null>;
  /** Creates the record or changes the given fields. */
  save(input: LegalSettingsInput): Promise<LegalSettings>;
}
