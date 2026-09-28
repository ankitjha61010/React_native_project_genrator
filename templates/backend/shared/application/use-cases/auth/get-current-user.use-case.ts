import { NotFoundError } from '{{IMPORT:core.errors}}';
import type { User } from '{{IMPORT:domain.user}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';

export class GetCurrentUserUseCase {
  constructor(private readonly users: UsersRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    return user;
  }
}
