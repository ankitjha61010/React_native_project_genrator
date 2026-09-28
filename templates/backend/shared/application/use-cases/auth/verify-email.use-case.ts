import { BadRequestError } from '{{IMPORT:core.errors}}';
import type { User } from '{{IMPORT:domain.user}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { OneTimeTokens } from '{{IMPORT:uc.support}}';

export class VerifyEmailUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly oneTimeTokens: OneTimeTokens,
  ) {}

  async execute(token: string): Promise<User> {
    const record = await this.oneTimeTokens.consume('email_verification', token);
    if (!record) throw new BadRequestError('This link is invalid or has expired', 'INVALID_TOKEN');
    return this.users.update(record.userId, { emailVerifiedAt: new Date() });
  }
}
