import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

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
