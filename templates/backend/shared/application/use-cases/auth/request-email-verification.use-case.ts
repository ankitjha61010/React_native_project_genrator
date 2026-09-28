import { ConflictError, NotFoundError } from '{{IMPORT:core.errors}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { OneTimeTokens } from '{{IMPORT:uc.support}}';

export class RequestEmailVerificationUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly oneTimeTokens: OneTimeTokens,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    if (user.emailVerifiedAt) throw new ConflictError('Email is already verified', 'EMAIL_ALREADY_VERIFIED');
    await this.oneTimeTokens.sendEmailVerification(user);
  }
}
