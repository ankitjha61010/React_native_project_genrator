import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 255 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
{{#if AUTH}}
    passwordHash: { type: String, required: true, select: true },
    role: { type: String, required: true, default: 'user', maxlength: 20 },
    emailVerifiedAt: { type: Date, default: null },
    isActive: { type: Boolean, required: true, default: true },
    tokenVersion: { type: Number, required: true, default: 0 },
    lastLoginAt: { type: Date, default: null },
{{#if SEC_LOCKOUT}}
    failedLoginAttempts: { type: Number, required: true, default: 0 },
    lockedUntil: { type: Date, default: null },
{{/if}}
{{/if}}
  },
  { timestamps: true, collection: 'users' },
);

userSchema.index({ createdAt: -1 });

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: import('mongoose').Types.ObjectId; createdAt: Date; updatedAt: Date };

export const UserModel = model('User', userSchema);
