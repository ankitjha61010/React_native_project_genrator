import { ConflictError } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import { normalizeEmail } from '{{IMPORT:domain.user}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { PasswordHasher } from '{{IMPORT:port.passwordHasher}}';
import { assertPasswordPolicy, type AuthResult, type AuthSettings, type ClientContext, type RegisterInput } from '{{IMPORT:app.authTypes}}';
import type { OneTimeTokens, SessionManager } from '{{IMPORT:uc.support}}';

export class RegisterUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionManager,
    private readonly oneTimeTokens: OneTimeTokens,
    private readonly settings: AuthSettings,
    private readonly logger: Logger,
  ) {}

  async execute(input: RegisterInput, client: ClientContext = {}): Promise<AuthResult> {
    assertPasswordPolicy(input.password, this.settings.password);
    const email = normalizeEmail(input.email);
    if (await this.users.findByEmail(email)) {
      throw new ConflictError('Email is already registered', 'EMAIL_TAKEN');
    }
    const user = await this.users.create({ email, name: input.name.trim(), passwordHash: await this.hasher.hash(input.password) });
    this.logger.info({ userId: user.id }, 'User registered');

    await this.oneTimeTokens
      .sendEmailVerification(user)
      .catch(error => this.logger.error({ err: error, userId: user.id }, 'Sending the verification email failed'));
    return { user, tokens: await this.sessions.issue(user, client) };
  }
}
