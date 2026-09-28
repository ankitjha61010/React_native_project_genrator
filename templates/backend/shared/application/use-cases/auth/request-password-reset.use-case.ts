import { normalizeEmail } from '{{IMPORT:domain.user}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { OneTimeTokens } from '{{IMPORT:uc.support}}';

/** Always succeeds, whether the email exists or not (no account enumeration). */
export class RequestPasswordResetUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly oneTimeTokens: OneTimeTokens,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    if (!user || !user.isActive) return;
    await this.oneTimeTokens.sendPasswordReset(user);
  }
}
