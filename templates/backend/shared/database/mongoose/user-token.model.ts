import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const userTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['email_verification', 'password_reset'] },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'user_tokens' },
);

userTokenSchema.index({ userId: 1, type: 1 });
// Expired one-time tokens are removed automatically.
userTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type UserTokenDocument = InferSchemaType<typeof userTokenSchema> & { _id: Types.ObjectId; userId: Types.ObjectId; createdAt: Date };

export const UserTokenModel = model('UserToken', userTokenSchema);
