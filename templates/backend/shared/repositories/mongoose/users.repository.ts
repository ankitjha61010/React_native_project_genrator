import { ConflictError, NotFoundError } from '{{IMPORT:core.errors}}';
import { pageOffset, type PageQuery } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
import { isRole{{#if NOTIFICATIONS}}, type Role{{/if}} } from '{{IMPORT:domain.roles}}';
{{/if}}
import type { User } from '{{IMPORT:domain.user}}';
import type { CreateUserData, UpdateUserData, UsersRepository } from '{{IMPORT:contract.users}}';
import { isUniqueViolation, isValidId } from '{{IMPORT:db.connection}}';
{{#if AUTH_REFRESH}}
import { RefreshTokenModel } from '{{IMPORT:mongoose.auth}}';
{{/if}}
{{#if SOCIAL}}
import { SocialAccountModel } from '{{IMPORT:mongoose.auth}}';
{{/if}}
{{#if CHAT}}
import { ConversationMemberModel, MessageModel } from '{{IMPORT:mongoose.chat}}';
{{/if}}
{{#if NOTIFICATIONS}}
import { DeviceModel, NotificationModel } from '{{IMPORT:mongoose.notifications}}';
{{/if}}
import { UserModel, type UserDocument } from '{{IMPORT:mongoose.user}}';

function toUser(doc: UserDocument): User {
  return {
    id: doc._id.toString(),
{{#if AUTH}}
    email: doc.email ?? null,
    name: doc.name,
    passwordHash: doc.passwordHash ?? null,
    role: isRole(doc.role) ? doc.role : 'user',
    emailVerifiedAt: doc.emailVerifiedAt ?? null,
    countryCode: doc.countryCode ?? null,
    phone: doc.phone ?? null,
    phoneVerifiedAt: doc.phoneVerifiedAt ?? null,
    avatarUrl: doc.avatarUrl ?? null,
    location: doc.location ?? null,
    bio: doc.bio ?? null,
    isActive: doc.isActive,
    tokenVersion: doc.tokenVersion,
    lastLoginAt: doc.lastLoginAt ?? null,
    lastSeenAt: doc.lastSeenAt ?? null,
{{#if SEC_LOCKOUT}}
    failedLoginAttempts: doc.failedLoginAttempts,
    lockedUntil: doc.lockedUntil ?? null,
{{/if}}
{{else}}
    email: doc.email,
    name: doc.name,
{{/if}}
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
{{#if AUTH}}
const TAKEN = () => new ConflictError('Email or mobile number is already registered', 'ACCOUNT_EXISTS');
{{else}}
const TAKEN = () => new ConflictError('Email is already registered', 'EMAIL_TAKEN');
{{/if}}

export class MongooseUsersRepository implements UsersRepository {
  async findById(id: string): Promise<User | null> {
    if (!isValidId(id)) return null;
    const doc = await UserModel.findById(id).lean<UserDocument>();
    return doc ? toUser(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email }).lean<UserDocument>();
    return doc ? toUser(doc) : null;
  }
{{#if AUTH}}

  async findByPhone(countryCode: string, phone: string): Promise<User | null> {
    const doc = await UserModel.findOne({ countryCode, phone }).lean<UserDocument>();
    return doc ? toUser(doc) : null;
  }

  async findManyByIds(ids: string[]): Promise<User[]> {
    const valid = ids.filter(isValidId);
    return valid.length ? (await UserModel.find({ _id: { $in: valid } }).lean<UserDocument[]>()).map(toUser) : [];
  }

  async search(term: string, options: { excludeId: string; limit: number }): Promise<User[]> {
    const pattern = new RegExp(escapeRegex(term), 'i');
    const docs = await UserModel.find({ isActive: true, _id: { $ne: options.excludeId }, $or: [{ name: pattern }, { email: pattern }] })
      .sort({ name: 1 })
      .limit(options.limit)
      .lean<UserDocument[]>();
    return docs.map(toUser);
  }
{{/if}}
{{#if NOTIFICATIONS}}

  async activeUserIds(role?: Role): Promise<string[]> {
    const docs = await UserModel.find({ isActive: true, ...(role ? { role } : {}) }, { _id: 1 }).lean<Array<{ _id: UserDocument['_id'] }>>();
    return docs.map(d => d._id.toString());
  }
{{/if}}

  async list(query: PageQuery): Promise<{ items: User[]; total: number }> {
    const search = query.search ? new RegExp(escapeRegex(query.search), 'i') : undefined;
    const filter = search ? { $or: [{ email: search }, { name: search }] } : {};
    const [docs, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(pageOffset(query)).limit(query.limit).lean<UserDocument[]>(),
      UserModel.countDocuments(filter),
    ]);
    return { items: docs.map(toUser), total };
  }

  async create(data: CreateUserData): Promise<User> {
    try {
      const doc = await UserModel.create(data);
      return toUser(doc.toObject<UserDocument>());
    } catch (error) {
      if (isUniqueViolation(error)) throw TAKEN();
      throw error;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    try {
      const doc = isValidId(id) ? await UserModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean<UserDocument>() : null;
      if (!doc) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
      return toUser(doc);
    } catch (error) {
      if (isUniqueViolation(error)) throw TAKEN();
      throw error;
    }
  }

{{#if REPLICA}}
  async saveReplica(user: User): Promise<void> {
    const { id, ...fields } = user;
    await UserModel.updateOne({ _id: id }, { $set: fields }, { upsert: true, timestamps: false });
  }

{{/if}}
  async delete(id: string): Promise<void> {
    const doc = isValidId(id) ? await UserModel.findByIdAndDelete(id) : null;
    if (!doc) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
{{#if AUTH}}
    // MongoDB has no foreign keys: delete what belongs to the user (SQL cascades do this).
    await Promise.all([
{{#if AUTH_REFRESH}}
      RefreshTokenModel.deleteMany({ userId: id }),
{{/if}}
{{#if SOCIAL}}
      SocialAccountModel.deleteMany({ userId: id }),
{{/if}}
{{#if CHAT}}
      ConversationMemberModel.deleteMany({ userId: id }),
      MessageModel.deleteMany({ senderId: id }),
{{/if}}
{{#if NOTIFICATIONS}}
      DeviceModel.deleteMany({ userId: id }),
      NotificationModel.deleteMany({ userId: id }),
{{/if}}
    ]);
{{/if}}
  }
}
