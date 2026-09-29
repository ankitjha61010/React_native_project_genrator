import type { PageQuery } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
import type { Role } from '{{IMPORT:domain.roles}}';
{{/if}}
import type { User } from '{{IMPORT:domain.user}}';

{{#if AUTH}}
export interface CreateUserData {
  email?: string | null;
  name: string;
  passwordHash?: string | null;
  role?: Role;
  emailVerifiedAt?: Date | null;
  countryCode?: string | null;
  phone?: string | null;
  phoneVerifiedAt?: Date | null;
  avatarUrl?: string | null;
}

export type UpdateUserData = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
{{else}}
export interface CreateUserData {
  email: string;
  name: string;
}

export type UpdateUserData = Partial<Pick<User, 'name'>>;
{{/if}}

{{#if STRICT}}
/**
 * Data access contract for users. Services depend on this interface only; the ORM
 * implementation lives in the data layer.
 */
{{else}}
/**
 * Everything the app can do with users in the database. Services use this interface, so the
 * tests can pass an in-memory version; the {{ORM_NAME}} class below is the real one.
 */
{{/if}}
export interface UsersRepository {
  findById(id: string): Promise<User | null>;
  /** `email` must already be normalized. */
  findByEmail(email: string): Promise<User | null>;
{{#if AUTH}}
  findByPhone(countryCode: string, phone: string): Promise<User | null>;
  findManyByIds(ids: string[]): Promise<User[]>;
  /**
   * Other active users by name (A → Z), for "start a chat" pickers. An empty `term` lists
   * everybody; `offset` / `limit` page through the result.
   */
  search(term: string, options: { excludeId: string; offset: number; limit: number }): Promise<{ items: User[]; total: number }>;
{{/if}}
{{#if NOTIFICATIONS}}
  /** Ids of active users, optionally with one role (broadcast audiences). */
  activeUserIds(role?: Role): Promise<string[]>;
{{/if}}
  list(query: PageQuery): Promise<{ items: User[]; total: number }>;
  /** Throws ConflictError when the email{{#if AUTH}} / phone number{{/if}} is taken. */
  create(data: CreateUserData): Promise<User>;
  /** Throws NotFoundError when the user doesn't exist{{#if AUTH}}, ConflictError when the email / phone is taken{{/if}}. */
  update(id: string, data: UpdateUserData): Promise<User>;
  /** Throws NotFoundError when the user doesn't exist. */
  delete(id: string): Promise<void>;
{{#if REPLICA}}
  /** Inserts or overwrites a copy of a user published by the identity service. */
  saveReplica(user: User): Promise<void>;
{{/if}}
}
