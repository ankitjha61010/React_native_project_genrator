import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const userSchema = new Schema(
  {
{{#if AUTH}}
    // Optional (mobile / social accounts) – unique when set, see the partial index below.
    email: { type: String, default: null, lowercase: true, trim: true, maxlength: 255 },
{{else}}
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 255 },
{{/if}}
    name: { type: String, required: true, trim: true, maxlength: 120 },
{{#if AUTH}}
    passwordHash: { type: String, default: null },
    role: { type: String, required: true, default: 'user', maxlength: 20 },
    emailVerifiedAt: { type: Date, default: null },
    countryCode: { type: String, default: null, maxlength: 8 },
    phone: { type: String, default: null, maxlength: 20 },
    phoneVerifiedAt: { type: Date, default: null },
    avatarUrl: { type: String, default: null, maxlength: 1024 },
    location: { type: String, default: null, maxlength: 120 },
    bio: { type: String, default: null, maxlength: 500 },
    isActive: { type: Boolean, required: true, default: true },
    tokenVersion: { type: Number, required: true, default: 0 },
    lastLoginAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null },
{{#if SEC_LOCKOUT}}
    failedLoginAttempts: { type: Number, required: true, default: 0 },
    lockedUntil: { type: Date, default: null },
{{/if}}
{{/if}}
  },
  { timestamps: true, collection: 'users' },
);

userSchema.index({ createdAt: -1 });
{{#if AUTH}}
// Unique only among users that have one (null never collides).
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ countryCode: 1, phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
{{/if}}

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };

export const UserModel = model('User', userSchema);
