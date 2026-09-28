{{#if AUTH}}
import { ForbiddenError } from '{{IMPORT:core.errors}}';
{{/if}}
import type { UsersRepository } from '{{IMPORT:contract.users}}';

export class DeleteUserUseCase {
  constructor(private readonly users: UsersRepository) {}

{{#if AUTH}}
  async execute(id: string, actorId: string): Promise<void> {
    if (id === actorId) throw new ForbiddenError('You cannot delete your own account here', 'SELF_MODIFICATION');
    await this.users.delete(id);
  }
{{else}}
  execute(id: string): Promise<void> {
    return this.users.delete(id);
  }
{{/if}}
}
