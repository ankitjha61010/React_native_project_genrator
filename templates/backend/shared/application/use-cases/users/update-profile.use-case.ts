import type { User } from '{{IMPORT:domain.user}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';

export interface UpdateProfileInput {
  name?: string;
}

/** The signed-in user updates their own profile. */
export class UpdateProfileUseCase {
  constructor(private readonly users: UsersRepository) {}

  execute(userId: string, input: UpdateProfileInput): Promise<User> {
    return this.users.update(userId, input.name !== undefined ? { name: input.name.trim() } : {});
  }
}
