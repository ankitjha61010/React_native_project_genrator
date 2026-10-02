import mongoose, { Schema, Document } from 'mongoose';

export interface ILegalSettings extends Document {
  termsUrl?: string;
  privacyPolicyUrl?: string;
  deleteAccountUrl?: string;
  termsHtml?: string;
  privacyPolicyHtml?: string;
  deleteAccountHtml?: string;
}

const LegalSettingsSchema = new Schema({
  termsUrl: { type: String, default: '' },
  privacyPolicyUrl: { type: String, default: '' },
  deleteAccountUrl: { type: String, default: '' },
  termsHtml: { type: String, default: '' },
  privacyPolicyHtml: { type: String, default: '' },
  deleteAccountHtml: { type: String, default: '' },
}, { timestamps: true });

export const LegalSettings = mongoose.model<ILegalSettings>('LegalSettings', LegalSettingsSchema);
