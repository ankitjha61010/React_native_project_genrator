import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
{{#if AUTH_REFRESH}}

const refreshTokenSchema = new Schema(
  {
    /** The JWT `jti` – a UUID set by the app. */
    _id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedById: { type: String, default: null },
    userAgent: { type: String, default: null, maxlength: 255 },
    ip: { type: String, default: null, maxlength: 45 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'refresh_tokens' },
);
// MongoDB removes expired refresh tokens automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenDocument = InferSchemaType<typeof refreshTokenSchema> & { userId: Types.ObjectId; createdAt: Date };
export const RefreshTokenModel = model('RefreshToken', refreshTokenSchema);
{{/if}}
{{#if CODES}}

const verificationCodeSchema = new Schema(
  {
    purpose: { type: String, required: true, maxlength: 32 },
    target: { type: String, required: true, maxlength: 255 },
    codeHash: { type: String, required: true },
    attempts: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'verification_codes' },
);
verificationCodeSchema.index({ purpose: 1, target: 1, createdAt: -1 });
// Codes are useless a day after they expire.
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86_400 });

export type VerificationCodeDocument = InferSchemaType<typeof verificationCodeSchema> & { _id: Types.ObjectId; createdAt: Date };
export const VerificationCodeModel = model('VerificationCode', verificationCodeSchema);
{{/if}}
{{#if SOCIAL}}

const socialAccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, required: true, maxlength: 20 },
    providerUserId: { type: String, required: true, maxlength: 255 },
    email: { type: String, default: null, maxlength: 255 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'social_accounts' },
);
socialAccountSchema.index({ provider: 1, providerUserId: 1 }, { unique: true });

export type SocialAccountDocument = InferSchemaType<typeof socialAccountSchema> & { _id: Types.ObjectId; userId: Types.ObjectId; createdAt: Date };
export const SocialAccountModel = model('SocialAccount', socialAccountSchema);
{{/if}}
