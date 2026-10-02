import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

/** One document: the legal links + pages edited in the admin panel. */
const legalSettingsSchema = new Schema(
  {
    termsUrl: { type: String, default: null, maxlength: 2048 },
    privacyPolicyUrl: { type: String, default: null, maxlength: 2048 },
    deleteAccountUrl: { type: String, default: null, maxlength: 2048 },
    termsHtml: { type: String, default: null },
    privacyPolicyHtml: { type: String, default: null },
    deleteAccountHtml: { type: String, default: null },
  },
  { timestamps: true, collection: 'legal_settings' },
);

export type LegalSettingsDocument = InferSchemaType<typeof legalSettingsSchema> & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };
export const LegalSettingsModel = model('LegalSettings', legalSettingsSchema);
