{{#if SEC_LOCKOUT}}
import { AccountLockedError, ForbiddenError, UnauthorizedError } from '{{IMPORT:core.errors}}';
{{else}}
import { ForbiddenError, UnauthorizedError } from '{{IMPORT:core.errors}}';
{{/if}}
import type { Logger } from '{{IMPORT:core.logger}}';
import { normalizeEmail{{#if SEC_LOCKOUT}}, type User{{/if}} } from '{{IMPORT:domain.user}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { PasswordHasher } from '{{IMPORT:port.passwordHasher}}';
import type { AuthResult{{#if SEC_LOCKOUT}}, AuthSettings{{/if}}, ClientContext, LoginInput } from '{{IMPORT:app.authTypes}}';
import type { SessionManager } from '{{IMPORT:uc.support}}';

export class LoginUseCase {
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionManager,
{{#if SEC_LOCKOUT}}
    private readonly settings: AuthSettings,
{{/if}}
    private readonly logger: Logger,
  ) {}

  async execute(input: LoginInput, client: ClientContext = {}): Promise<AuthResult> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    if (!user) {
      // Same work as a real check, so response times don't reveal which emails exist.
      this.dummyHash ??= this.hasher.hash('timing-attack-protection-password-1');
      await this.hasher.verify(await this.dummyHash, input.password);
      throw this.invalidCredentials();
    }
{{#if SEC_LOCKOUT}}
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new AccountLockedError(user.lockedUntil);
{{/if}}

    if (!(await this.hasher.verify(user.passwordHash, input.password))) {
{{#if SEC_LOCKOUT}}
      await this.recordFailedLogin(user, client);
{{else}}
      this.logger.warn({ userId: user.id, ip: client.ip }, 'Failed login');
{{/if}}
      throw this.invalidCredentials();
    }
    if (!user.isActive) throw new ForbiddenError('This account has been disabled', 'ACCOUNT_DISABLED');

    const updated = await this.users.update(user.id, {
      lastLoginAt: new Date(),
{{#if SEC_LOCKOUT}}
      failedLoginAttempts: 0,
      lockedUntil: null,
{{/if}}
      // Transparently upgrade old hashes (other algorithm / cost).
      ...(this.hasher.needsRehash(user.passwordHash) ? { passwordHash: await this.hasher.hash(input.password) } : {}),
    });
    return { user: updated, tokens: await this.sessions.issue(updated, client) };
  }

  private invalidCredentials() {
    return new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }
{{#if SEC_LOCKOUT}}

  private async recordFailedLogin(user: User, client: ClientContext): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const { maxAttempts, minutes } = this.settings.lockout;
    if (attempts >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + minutes * 60_000);
      await this.users.update(user.id, { failedLoginAttempts: 0, lockedUntil });
      this.logger.warn({ userId: user.id, ip: client.ip, lockedUntil }, 'Account locked after repeated failed logins');
    } else {
      await this.users.update(user.id, { failedLoginAttempts: attempts });
      this.logger.warn({ userId: user.id, ip: client.ip, attempts }, 'Failed login');
    }
  }
{{/if}}
}
