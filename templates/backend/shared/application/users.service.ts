{{#if AUTH}}
import { ForbiddenError, NotFoundError } from '{{IMPORT:core.errors}}';
{{else}}
import { NotFoundError } from '{{IMPORT:core.errors}}';
{{/if}}
import { Paginated, type PageQuery } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
import type { Role } from '{{IMPORT:domain.roles}}';
{{/if}}
{{#if NO_AUTH}}
import { normalizeEmail, type User } from '{{IMPORT:domain.user}}';
{{else}}
import type { User } from '{{IMPORT:domain.user}}';
{{/if}}
import type { UsersRepository } from '{{IMPORT:contract.users}}';

{{#if AUTH}}
/** Fields an administrator may change. */
export interface UpdateUserInput {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

export interface UpdateProfileInput {
  name?: string;
}
{{else}}
export interface CreateUserInput {
  email: string;
  name: string;
}

export interface UpdateUserInput {
  name?: string;
}
{{/if}}

export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async list(query: PageQuery): Promise<Paginated<User>> {
    const { items, total } = await this.users.list(query);
    return Paginated.of(items, total, query);
  }

  async getById(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
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

  /** Admin update. Changing the role or disabling the account signs the user out everywhere. */
  async update(id: string, input: UpdateUserInput, actorId: string): Promise<User> {
    const user = await this.getById(id);
    if (id === actorId && (input.role !== undefined || input.isActive === false)) {
      throw new ForbiddenError('You cannot change your own role or disable your own account', 'SELF_MODIFICATION');
    }
    const securityChange = (input.role !== undefined && input.role !== user.role) || (input.isActive !== undefined && input.isActive !== user.isActive);
    return this.users.update(id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(securityChange ? { tokenVersion: user.tokenVersion + 1 } : {}),
    });
  }

  /** The signed-in user updates their own profile. */
  updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    return this.users.update(userId, input.name !== undefined ? { name: input.name.trim() } : {});
  }

  async delete(id: string, actorId: string): Promise<void> {
    if (id === actorId) throw new ForbiddenError('You cannot delete your own account here', 'SELF_MODIFICATION');
    await this.users.delete(id);
  }
{{/if}}
}
