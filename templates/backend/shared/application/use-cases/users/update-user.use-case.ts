{{#if AUTH}}
import { ForbiddenError, NotFoundError } from '{{IMPORT:core.errors}}';
import type { Role } from '{{IMPORT:domain.roles}}';
{{/if}}
import type { User } from '{{IMPORT:domain.user}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';

export interface UpdateUserInput {
  name?: string;
{{#if AUTH}}
  role?: Role;
  isActive?: boolean;
{{/if}}
}

{{#if AUTH}}
/** Admin update. Changing the role or disabling the account signs the user out everywhere. */
{{/if}}
export class UpdateUserUseCase {
  constructor(private readonly users: UsersRepository) {}

{{#if AUTH}}
  async execute(id: string, input: UpdateUserInput, actorId: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
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
{{else}}
  execute(id: string, input: UpdateUserInput): Promise<User> {
    return this.users.update(id, input.name !== undefined ? { name: input.name.trim() } : {});
  }
{{/if}}
}
