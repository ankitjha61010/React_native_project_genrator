import type { LegalSettings, LegalSettingsInput } from '{{IMPORT:domain.legal}}';
import type { LegalRepository } from '{{IMPORT:contract.legal}}';
import { LegalSettingsModel, type LegalSettingsDocument } from '{{IMPORT:mongoose.legal}}';

const toSettings = (d: LegalSettingsDocument): LegalSettings => ({
  termsUrl: d.termsUrl ?? null,
  privacyPolicyUrl: d.privacyPolicyUrl ?? null,
  deleteAccountUrl: d.deleteAccountUrl ?? null,
  termsHtml: d.termsHtml ?? null,
  privacyPolicyHtml: d.privacyPolicyHtml ?? null,
  deleteAccountHtml: d.deleteAccountHtml ?? null,
  updatedAt: d.updatedAt,
});

export class MongooseLegalRepository implements LegalRepository {
  async find(): Promise<LegalSettings | null> {
    const doc = await LegalSettingsModel.findOne().lean<LegalSettingsDocument>();
    return doc && toSettings(doc);
  }

  async save(input: LegalSettingsInput): Promise<LegalSettings> {
    const doc = await LegalSettingsModel.findOneAndUpdate({}, { $set: input }, { upsert: true, returnDocument: 'after' }).lean<LegalSettingsDocument>();
    return toSettings(doc);
  }
}
