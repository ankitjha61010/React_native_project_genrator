{{#if AUTH_REFRESH}}
import { newId, parseDuration, randomToken, safeEqual, sha256 } from '{{IMPORT:core.crypto}}';
{{else}}
import { parseDuration, randomToken, sha256 } from '{{IMPORT:core.crypto}}';
{{/if}}
{{#if SEC_LOCKOUT}}
import { AccountLockedError, BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '{{IMPORT:core.errors}}';
{{else}}
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '{{IMPORT:core.errors}}';
{{/if}}
import type { Logger } from '{{IMPORT:core.logger}}';
import type { UserTokenType } from '{{IMPORT:domain.authTokens}}';
import { normalizeEmail, type User } from '{{IMPORT:domain.user}}';
{{#if AUTH_REFRESH}}
import type { RefreshTokensRepository } from '{{IMPORT:contract.refreshTokens}}';
{{/if}}
import type { UserTokensRepository } from '{{IMPORT:contract.userTokens}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { Mailer } from '{{IMPORT:port.mailer}}';
import type { PasswordHasher } from '{{IMPORT:port.passwordHasher}}';
import type { TokenService } from '{{IMPORT:port.tokenService}}';
import {
  assertPasswordPolicy,
  type AccessTokens,
  type AuthResult,
  type AuthSettings,
  type AuthTokens,
  type ChangePasswordInput,
  type ClientContext,
  type LoginInput,
  type RegisterInput,
} from '{{IMPORT:app.authTypes}}';

const INVALID_CREDENTIALS = () => new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
const INVALID_SESSION = () => new UnauthorizedError('Your session is no longer valid, please log in again', 'SESSION_REVOKED');

/**
 * Authentication: registration, login, {{#if AUTH_REFRESH}}token refresh{{#if AUTH_ROTATION}} with rotation{{/if}}, {{/if}}logout, password change / reset
 * and email verification. Framework independent – the HTTP layer only calls these methods.
 */
export class AuthService {
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UsersRepository,
{{#if AUTH_REFRESH}}
    private readonly refreshTokens: RefreshTokensRepository,
{{/if}}
    private readonly userTokens: UserTokensRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly mailer: Mailer,
    private readonly settings: AuthSettings,
    private readonly logger: Logger,
  ) {}

  async register(input: RegisterInput, client: ClientContext = {}): Promise<AuthResult> {
    assertPasswordPolicy(input.password, this.settings.password);
    const email = normalizeEmail(input.email);
    if (await this.users.findByEmail(email)) {
      throw new ConflictError('Email is already registered', 'EMAIL_TAKEN');
    }
    const user = await this.users.create({ email, name: input.name.trim(), passwordHash: await this.hasher.hash(input.password) });
    this.logger.info({ userId: user.id }, 'User registered');

    await this.sendEmailVerification(user).catch(error => this.logger.error({ err: error, userId: user.id }, 'Sending the verification email failed'));
    return { user, tokens: await this.issueTokens(user, client) };
  }

  async login(input: LoginInput, client: ClientContext = {}): Promise<AuthResult> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    if (!user) {
      // Same work as a real check, so response times don't reveal which emails exist.
      await this.hasher.verify(await this.getDummyHash(), input.password);
      throw INVALID_CREDENTIALS();
    }
{{#if SEC_LOCKOUT}}
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AccountLockedError(user.lockedUntil);
    }
{{/if}}

    if (!(await this.hasher.verify(user.passwordHash, input.password))) {
{{#if SEC_LOCKOUT}}
      await this.recordFailedLogin(user, client);
{{else}}
      this.logger.warn({ userId: user.id, ip: client.ip }, 'Failed login');
{{/if}}
      throw INVALID_CREDENTIALS();
    }
    if (!user.isActive) {
      throw new ForbiddenError('This account has been disabled', 'ACCOUNT_DISABLED');
    }

    const updated = await this.users.update(user.id, {
      lastLoginAt: new Date(),
{{#if SEC_LOCKOUT}}
      failedLoginAttempts: 0,
      lockedUntil: null,
{{/if}}
      // Transparently upgrade old hashes (other algorithm / cost).
      ...(this.hasher.needsRehash(user.passwordHash) ? { passwordHash: await this.hasher.hash(input.password) } : {}),
    });
    return { user: updated, tokens: await this.issueTokens(updated, client) };
  }
{{#if AUTH_REFRESH}}

{{#if AUTH_ROTATION}}
  /** Exchanges a refresh token for a new token pair; the used refresh token is revoked (rotation). */
{{else}}
  /** Exchanges a refresh token for a new access token (the refresh token stays valid until it expires). */
{{/if}}
  async refresh(refreshToken: string, client: ClientContext = {}): Promise<AuthResult> {
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    const stored = await this.refreshTokens.findById(payload.jti);
    if (!stored || stored.userId !== payload.sub || !safeEqual(stored.tokenHash, sha256(refreshToken))) {
      throw new UnauthorizedError('Invalid refresh token', 'INVALID_TOKEN');
    }
    if (stored.revokedAt) {
{{#if AUTH_ROTATION}}
      // A rotated token was used again: it was probably stolen. Kill the whole family.
      await this.refreshTokens.revokeFamily(stored.familyId);
      this.logger.warn({ userId: stored.userId, familyId: stored.familyId, ip: client.ip }, 'Refresh token reuse detected');
      throw new UnauthorizedError('Refresh token reuse detected, please log in again', 'TOKEN_REUSED');
{{else}}
      throw new UnauthorizedError('Refresh token has been revoked', 'TOKEN_REVOKED');
{{/if}}
    }
    if (stored.expiresAt <= new Date()) {
      throw new UnauthorizedError('Refresh token expired', 'TOKEN_EXPIRED');
    }
    const user = await this.users.findById(stored.userId);
    if (!user || !user.isActive) {
      await this.refreshTokens.revoke(stored.id);
      throw INVALID_SESSION();
    }
{{#if AUTH_ROTATION}}

    const next = await this.createRefreshToken(user, client, stored.familyId);
    await this.refreshTokens.revoke(stored.id, next.id);
    return { user, tokens: { ...this.createAccessToken(user), refreshToken: next.token, refreshTokenExpiresAt: next.expiresAt.toISOString() } };
{{else}}
    return { user, tokens: { ...this.createAccessToken(user), refreshToken, refreshTokenExpiresAt: stored.expiresAt.toISOString() } };
{{/if}}
  }

  /**
   * Ends the session of this refresh token (other devices stay signed in). Works without a
   * valid access token, so an app can always log out.
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.tokens.verifyRefreshToken(refreshToken);
      const stored = await this.refreshTokens.findById(payload.jti);
      if (stored && safeEqual(stored.tokenHash, sha256(refreshToken))) await this.refreshTokens.revoke(stored.id);
    } catch {
      // Invalid / expired token – nothing to revoke.
    }
  }

  /** Signs the user out on every device. */
  async logoutAll(userId: string): Promise<void> {
    await this.revokeAllSessions(userId);
  }
{{else}}

  /**
   * Plain JWT mode has no server-side session per device: logging out invalidates every
   * token of the user (their token version is bumped).
   */
  async logout(userId: string): Promise<void> {
    await this.revokeAllSessions(userId);
  }
{{/if}}

  /** Resolves the user behind an access token (used by the auth guard / middleware). */
  async authenticate(accessToken: string): Promise<User> {
    const payload = this.tokens.verifyAccessToken(accessToken);
    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive || user.tokenVersion !== payload.tv) throw INVALID_SESSION();
    return user;
  }

  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    return user;
  }

  /** Changes the password, signs out every other session and returns fresh tokens. */
  async changePassword(userId: string, input: ChangePasswordInput, client: ClientContext = {}): Promise<AuthResult> {
    const user = await this.getCurrentUser(userId);
    if (!(await this.hasher.verify(user.passwordHash, input.currentPassword))) {
      throw new BadRequestError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }
    if (input.currentPassword === input.newPassword) {
      throw new BadRequestError('The new password must be different', 'PASSWORD_UNCHANGED');
    }
    assertPasswordPolicy(input.newPassword, this.settings.password, 'newPassword');

    await this.revokeAllSessions(user.id);
    const updated = await this.users.update(user.id, { passwordHash: await this.hasher.hash(input.newPassword) });
    this.logger.info({ userId: user.id }, 'Password changed');
    return { user: updated, tokens: await this.issueTokens(updated, client) };
  }

  /** Always succeeds, whether the email exists or not (no account enumeration). */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    if (!user || !user.isActive) return;
    const token = await this.createOneTimeToken(user.id, 'password_reset', this.settings.passwordResetTtl);
    await this.mailer.send({
      to: user.email,
      subject: 'Reset your password',
      text: `Hi ${user.name},\n\nReset your password: ${this.settings.appUrl}/reset-password?token=${token}\n\nThe link expires in ${this.settings.passwordResetTtl}. If you didn't ask for it, ignore this email.`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.userTokens.findValid('password_reset', sha256(token), new Date());
    if (!record) throw new BadRequestError('This link is invalid or has expired', 'INVALID_TOKEN');
    assertPasswordPolicy(newPassword, this.settings.password, 'newPassword');

    await this.userTokens.markUsed(record.id);
    await this.revokeAllSessions(record.userId);
    await this.users.update(record.userId, {
      passwordHash: await this.hasher.hash(newPassword),
{{#if SEC_LOCKOUT}}
      failedLoginAttempts: 0,
      lockedUntil: null,
{{/if}}
    });
    this.logger.info({ userId: record.userId }, 'Password reset');
  }

  async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.getCurrentUser(userId);
    if (user.emailVerifiedAt) throw new ConflictError('Email is already verified', 'EMAIL_ALREADY_VERIFIED');
    await this.sendEmailVerification(user);
  }

  async verifyEmail(token: string): Promise<User> {
    const record = await this.userTokens.findValid('email_verification', sha256(token), new Date());
    if (!record) throw new BadRequestError('This link is invalid or has expired', 'INVALID_TOKEN');
    await this.userTokens.markUsed(record.id);
    return this.users.update(record.userId, { emailVerifiedAt: new Date() });
  }

  // ── helpers ────────────────────────────────────────────────────────────────

{{#if AUTH_REFRESH}}
  private async issueTokens(user: User, client: ClientContext): Promise<AuthTokens> {
    const refresh = await this.createRefreshToken(user, client);
    return { ...this.createAccessToken(user), refreshToken: refresh.token, refreshTokenExpiresAt: refresh.expiresAt.toISOString() };
  }
{{else}}
  private async issueTokens(user: User, _client: ClientContext): Promise<AuthTokens> {
    return this.createAccessToken(user);
  }
{{/if}}

  private createAccessToken(user: User): AccessTokens {
    const access = this.tokens.signAccessToken({ sub: user.id, role: user.role, tv: user.tokenVersion });
    return {
      tokenType: 'Bearer',
      accessToken: access.token,
      expiresIn: access.expiresIn,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
    };
  }
{{#if AUTH_REFRESH}}

  private async createRefreshToken(user: User, client: ClientContext, familyId = newId()) {
    const id = newId();
    const signed = this.tokens.signRefreshToken({ sub: user.id, jti: id, fam: familyId });
    await this.refreshTokens.create({
      id,
      userId: user.id,
      tokenHash: sha256(signed.token),
      familyId,
      expiresAt: signed.expiresAt,
      userAgent: client.userAgent?.slice(0, 255) ?? null,
      ip: client.ip ?? null,
    });
    return { id, token: signed.token, expiresAt: signed.expiresAt };
  }
{{/if}}

  /** Invalidates every access token (token version) {{#if AUTH_REFRESH}}and refresh token {{/if}}of the user. */
  private async revokeAllSessions(userId: string): Promise<void> {
    const user = await this.getCurrentUser(userId);
    await this.users.update(userId, { tokenVersion: user.tokenVersion + 1 });
{{#if AUTH_REFRESH}}
    await this.refreshTokens.revokeAllForUser(userId);
{{/if}}
  }

  private async sendEmailVerification(user: User): Promise<void> {
    const token = await this.createOneTimeToken(user.id, 'email_verification', this.settings.emailVerificationTtl);
    await this.mailer.send({
      to: user.email,
      subject: 'Verify your email address',
      text: `Hi ${user.name},\n\nConfirm your email address: ${this.settings.appUrl}/verify-email?token=${token}\n\nThe link expires in ${this.settings.emailVerificationTtl}.`,
    });
  }

  /** Creates a one-time token (only its hash is stored) and returns the raw token. */
  private async createOneTimeToken(userId: string, type: UserTokenType, ttl: string): Promise<string> {
    await this.userTokens.invalidateAll(userId, type);
    const token = randomToken();
    await this.userTokens.create({ userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + parseDuration(ttl)) });
    return token;
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

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash('timing-attack-protection-password-1');
    return this.dummyHash;
  }
}
