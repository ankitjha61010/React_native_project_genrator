{{#if AUTH}}
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
{{else}}
import { NotFoundError } from '{{IMPORT:core.errors}}';
{{/if}}
import { {{#if AUTH}}pageOffset, {{/if}}Paginated, type PageQuery } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
import type { UserRole } from '{{IMPORT:domain.roles}}';
import { normalizePhone, toUserSummary, type User, type UserSummary } from '{{IMPORT:domain.user}}';
import type { FileStorage, UploadedFile } from '{{IMPORT:port.fileStorage}}';
{{else}}
import { normalizeEmail, type User } from '{{IMPORT:domain.user}}';
{{/if}}
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import { USERS_MESSAGES } from '{{IMPORT:messages.users}}';
{{#if AUTH}}

/** Fields an administrator may change. */
export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

/** Fields users change on their own profile (the app's Edit Profile screen). */
export interface UpdateProfileInput {
  name?: string;
  countryCode?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
}

/** Image types accepted as avatars. */
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const blankToNull = (value: string | null | undefined) => (value === undefined ? undefined : value?.trim() || null);
{{else}}

export interface CreateUserInput {
  email: string;
  name: string;
}

export interface UpdateUserInput {
  name?: string;
}
{{/if}}

{{#if GROUP_CHAT}}
/** Runs before a user is deleted, e.g. to hand their group admin role to another member. */
export type BeforeUserDeleted = (userId: string) => Promise<void>;

{{/if}}
export class UsersService {
{{#if AUTH}}
  constructor(
    private readonly users: UsersRepository,
    private readonly storage: FileStorage,
    private readonly logger: Logger,
{{#if GROUP_CHAT}}
    private readonly beforeDelete: BeforeUserDeleted = async () => undefined,
{{/if}}
  ) {}
{{else}}
  constructor(private readonly users: UsersRepository) {}
{{/if}}

  async list(query: PageQuery): Promise<Paginated<User>> {
    const { items, total } = await this.users.list(query);
    return Paginated.of(items, total, query);
  }

  async getById(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError(USERS_MESSAGES.notFound);
    return user;
  }
{{#if NO_AUTH}}

  create(input: CreateUserInput): Promise<User> {
    return this.users.create({ email: normalizeEmail(input.email), name: input.name.trim() });
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    return this.users.update(id, input.name !== undefined ? { name: input.name.trim() } : {});
  }

  delete(id: string): Promise<void> {
    return this.users.delete(id);
  }
{{/if}}
{{#if AUTH}}

  // ── own profile ────────────────────────────────────────────────────────────

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    const user = await this.getById(userId);
    const changes: Parameters<UsersRepository['update']>[1] = {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.location !== undefined ? { location: blankToNull(input.location) } : {}),
      ...(input.bio !== undefined ? { bio: blankToNull(input.bio) } : {}),
    };

    if (input.phone !== undefined) {
      if (!input.phone) {
        Object.assign(changes, { countryCode: null, phone: null, phoneVerifiedAt: null });
      } else {
        if (!input.countryCode && !user.countryCode) throw new BadRequestError(USERS_MESSAGES.countryCodeRequired);
        const next = normalizePhone(input.countryCode ?? user.countryCode ?? '', input.phone);
        if (next.countryCode !== user.countryCode || next.phone !== user.phone) {
          const owner = await this.users.findByPhone(next.countryCode, next.phone);
          if (owner && owner.id !== userId) throw new ConflictError(USERS_MESSAGES.phoneTaken);
          // A new number has to be verified again.
          Object.assign(changes, next, { phoneVerifiedAt: null });
        }
      }
    }
    return this.users.update(userId, changes);
  }

  /** Replaces the avatar (the old file is deleted). */
  async setAvatar(userId: string, file: UploadedFile): Promise<User> {
    if (!AVATAR_MIME_TYPES.includes(file.mimeType)) throw new BadRequestError(USERS_MESSAGES.invalidAvatar);
    const user = await this.getById(userId);
    const stored = await this.storage.save(file, 'avatars');
    const updated = await this.users.update(userId, { avatarUrl: stored.url });
    if (user.avatarUrl) await this.storage.delete(user.avatarUrl).catch(error => this.logger.warn({ err: error }, 'Old avatar not deleted'));
    return updated;
  }

  async removeAvatar(userId: string): Promise<User> {
    const user = await this.getById(userId);
    if (user.avatarUrl) await this.storage.delete(user.avatarUrl).catch(error => this.logger.warn({ err: error }, 'Avatar file not deleted'));
    return this.users.update(userId, { avatarUrl: null });
  }

{{#if DELETE_ACCOUNT}}
  /**
   * Deletes the signed-in user's account for good (App Store / Play Store requirement): the user
   * row and everything that belongs to it ({{#if AUTH_REFRESH}}sessions, {{/if}}{{#if SOCIAL}}social accounts, {{/if}}{{#if CHAT}}chat memberships and messages, {{/if}}{{#if DEVICES}}devices, {{/if}}{{#if NOTIFICATIONS}}notifications, {{/if}}the avatar file).
   */
  async deleteAccount(userId: string): Promise<void> {
    const user = await this.getById(userId);
{{#if GROUP_CHAT}}
    await this.beforeDelete(userId);
{{/if}}
    await this.users.delete(userId);
    if (user.avatarUrl) await this.storage.delete(user.avatarUrl).catch(() => undefined);
    this.logger.info({ userId }, 'Account deleted by the user');
  }

{{/if}}
  /** Other users by name / email, A → Z (the app's "New chat" list). An empty search lists everybody. */
  async search(userId: string, query: PageQuery): Promise<Paginated<UserSummary>> {
    const { items, total } = await this.users.search(query.search?.trim() ?? '', { excludeId: userId, offset: pageOffset(query), limit: query.limit });
    return Paginated.of(items.map(toUserSummary), total, query);
  }

  // ── administration ─────────────────────────────────────────────────────────

  /** Admin update. Changing the role or disabling the account signs the user out everywhere. */
  async update(id: string, input: UpdateUserInput, actorId: string): Promise<User> {
    const user = await this.getById(id);
    if (id === actorId && (input.role !== undefined || input.isActive === false)) {
      throw new ForbiddenError(USERS_MESSAGES.selfModification);
    }
    const securityChange = (input.role !== undefined && input.role !== user.role) || (input.isActive !== undefined && input.isActive !== user.isActive);
    return this.users.update(id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(securityChange ? { tokenVersion: user.tokenVersion + 1 } : {}),
    });
  }

  async delete(id: string, actorId: string): Promise<void> {
    if (id === actorId) throw new ForbiddenError(USERS_MESSAGES.selfDelete);
{{#if GROUP_CHAT}}
    await this.getById(id);
    await this.beforeDelete(id);
{{/if}}
    await this.users.delete(id);
  }
{{/if}}
}
