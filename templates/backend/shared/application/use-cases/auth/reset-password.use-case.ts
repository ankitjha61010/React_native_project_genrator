import { BadRequestError } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { PasswordHasher } from '{{IMPORT:port.passwordHasher}}';
import { assertPasswordPolicy, type AuthSettings } from '{{IMPORT:app.authTypes}}';
import type { OneTimeTokens, SessionManager } from '{{IMPORT:uc.support}}';

export class ResetPasswordUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly oneTimeTokens: OneTimeTokens,
    private readonly sessions: SessionManager,
    private readonly settings: AuthSettings,
    private readonly logger: Logger,
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    assertPasswordPolicy(newPassword, this.settings.password, 'newPassword');
    const record = await this.oneTimeTokens.consume('password_reset', token);
    if (!record) throw new BadRequestError('This link is invalid or has expired', 'INVALID_TOKEN');
    const user = await this.users.findById(record.userId);
    if (!user) throw new BadRequestError('This link is invalid or has expired', 'INVALID_TOKEN');

    await this.sessions.revokeAll(user);
    await this.users.update(user.id, {
      passwordHash: await this.hasher.hash(newPassword),
{{#if SEC_LOCKOUT}}
      failedLoginAttempts: 0,
      lockedUntil: null,
{{/if}}
    });
    this.logger.info({ userId: user.id }, 'Password reset');
  }
}
