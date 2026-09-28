import { ConflictError, NotFoundError } from '{{IMPORT:core.errors}}';
import { pageOffset, type PageQuery } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
import { isRole } from '{{IMPORT:domain.roles}}';
{{/if}}
import type { User } from '{{IMPORT:domain.user}}';
import type { CreateUserData, UpdateUserData, UsersRepository } from '{{IMPORT:contract.users}}';
import { isUniqueViolation, isValidId } from '{{IMPORT:db.connection}}';
import { UserModel, type UserDocument } from '{{IMPORT:mongoose.user}}';

function toUser(doc: UserDocument): User {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
{{#if AUTH}}
    passwordHash: doc.passwordHash,
    role: isRole(doc.role) ? doc.role : 'user',
    emailVerifiedAt: doc.emailVerifiedAt ?? null,
    isActive: doc.isActive,
    tokenVersion: doc.tokenVersion,
    lastLoginAt: doc.lastLoginAt ?? null,
{{#if SEC_LOCKOUT}}
    failedLoginAttempts: doc.failedLoginAttempts,
    lockedUntil: doc.lockedUntil ?? null,
{{/if}}
{{/if}}
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
      if (isUniqueViolation(error)) throw new ConflictError('Email is already registered', 'EMAIL_TAKEN');
      throw error;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const doc = isValidId(id)
      ? await UserModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean<UserDocument>()
      : null;
    if (!doc) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    return toUser(doc);
  }

  async delete(id: string): Promise<void> {
    const doc = isValidId(id) ? await UserModel.findByIdAndDelete(id) : null;
    if (!doc) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  }
}
