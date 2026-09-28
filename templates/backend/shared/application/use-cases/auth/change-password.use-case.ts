import { BadRequestError, NotFoundError } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { PasswordHasher } from '{{IMPORT:port.passwordHasher}}';
import { assertPasswordPolicy, type AuthResult, type AuthSettings, type ChangePasswordInput, type ClientContext } from '{{IMPORT:app.authTypes}}';
import type { SessionManager } from '{{IMPORT:uc.support}}';

/** Changes the password, signs out every other session and returns fresh tokens. */
export class ChangePasswordUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionManager,
    private readonly settings: AuthSettings,
    private readonly logger: Logger,
  ) {}

  async execute(userId: string, input: ChangePasswordInput, client: ClientContext = {}): Promise<AuthResult> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    if (!(await this.hasher.verify(user.passwordHash, input.currentPassword))) {
      throw new BadRequestError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }
    if (input.currentPassword === input.newPassword) {
      throw new BadRequestError('The new password must be different', 'PASSWORD_UNCHANGED');
    }
    assertPasswordPolicy(input.newPassword, this.settings.password, 'newPassword');

    const revoked = await this.sessions.revokeAll(user);
    const updated = await this.users.update(revoked.id, { passwordHash: await this.hasher.hash(input.newPassword) });
    this.logger.info({ userId: user.id }, 'Password changed');
    return { user: updated, tokens: await this.sessions.issue(updated, client) };
  }
}
