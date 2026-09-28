import { normalizeEmail, type User } from '{{IMPORT:domain.user}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';

export interface CreateUserInput {
  email: string;
  name: string;
}

export class CreateUserUseCase {
  constructor(private readonly users: UsersRepository) {}

  execute(input: CreateUserInput): Promise<User> {
    return this.users.create({ email: normalizeEmail(input.email), name: input.name.trim() });
  }
}
