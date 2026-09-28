import type { PageQuery } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
import type { Role } from '{{IMPORT:domain.roles}}';
{{/if}}
import type { User } from '{{IMPORT:domain.user}}';

export interface CreateUserData {
  email: string;
  name: string;
{{#if AUTH}}
  passwordHash: string;
  role?: Role;
  emailVerifiedAt?: Date | null;
{{/if}}
}

export type UpdateUserData = Partial<Omit<User, 'id' | 'email' | 'createdAt' | 'updatedAt'>>;

/**
 * Data access contract for users. Services / use-cases depend on this interface only;
 * the ORM implementation lives in the infrastructure layer.
 */
export interface UsersRepository {
  findById(id: string): Promise<User | null>;
  /** `email` must already be normalized. */
  findByEmail(email: string): Promise<User | null>;
  list(query: PageQuery): Promise<{ items: User[]; total: number }>;
  /** Throws ConflictError when the email is taken. */
  create(data: CreateUserData): Promise<User>;
  /** Throws NotFoundError when the user doesn't exist. */
  update(id: string, data: UpdateUserData): Promise<User>;
  /** Throws NotFoundError when the user doesn't exist. */
  delete(id: string): Promise<void>;
}
