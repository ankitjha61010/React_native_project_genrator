{{#if AUTH_REFRESH}}
import { newId, parseDuration, randomToken, sha256 } from '{{IMPORT:core.crypto}}';
{{else}}
import { parseDuration, randomToken, sha256 } from '{{IMPORT:core.crypto}}';
{{/if}}
import type { Logger } from '{{IMPORT:core.logger}}';
import type { UserTokenType } from '{{IMPORT:domain.authTokens}}';
import type { User } from '{{IMPORT:domain.user}}';
{{#if AUTH_REFRESH}}
import type { RefreshTokensRepository } from '{{IMPORT:contract.refreshTokens}}';
{{/if}}
import type { UserTokensRepository } from '{{IMPORT:contract.userTokens}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { Mailer } from '{{IMPORT:port.mailer}}';
import type { TokenService } from '{{IMPORT:port.tokenService}}';
import type { AccessTokens, AuthSettings, AuthTokens, ClientContext } from '{{IMPORT:app.authTypes}}';

/** Issues and revokes sessions (access tokens{{#if AUTH_REFRESH}} + stored refresh tokens{{/if}}). Shared by the auth use-cases. */
export class SessionManager {
  constructor(
    private readonly users: UsersRepository,
{{#if AUTH_REFRESH}}
    private readonly refreshTokens: RefreshTokensRepository,
{{/if}}
    private readonly tokens: TokenService,
  ) {}

{{#if AUTH_REFRESH}}
  async issue(user: User, client: ClientContext, familyId?: string): Promise<AuthTokens> {
    return (await this.issueWithId(user, client, familyId)).tokens;
  }

  /** Like `issue`, also returning the id of the new refresh token (used for rotation). */
  async issueWithId(user: User, client: ClientContext, familyId?: string): Promise<{ tokens: AuthTokens; refreshTokenId: string }> {
    const refresh = await this.createRefreshToken(user, client, familyId);
    return {
      tokens: { ...this.accessToken(user), refreshToken: refresh.token, refreshTokenExpiresAt: refresh.expiresAt.toISOString() },
      refreshTokenId: refresh.id,
    };
  }
{{else}}
  async issue(user: User, _client: ClientContext): Promise<AuthTokens> {
    return this.accessToken(user);
  }
{{/if}}

  accessToken(user: User): AccessTokens {
    const access = this.tokens.signAccessToken({ sub: user.id, role: user.role, tv: user.tokenVersion });
    return {
      tokenType: 'Bearer',
      accessToken: access.token,
      expiresIn: access.expiresIn,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
    };
  }

  /** Invalidates every access token {{#if AUTH_REFRESH}}and refresh token {{/if}}of the user. */
  async revokeAll(user: User): Promise<User> {
    const updated = await this.users.update(user.id, { tokenVersion: user.tokenVersion + 1 });
{{#if AUTH_REFRESH}}
    await this.refreshTokens.revokeAllForUser(user.id);
{{/if}}
    return updated;
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
}

/** One-time email tokens (verification, password reset). Only the hash is stored. */
export class OneTimeTokens {
  constructor(
    private readonly userTokens: UserTokensRepository,
    private readonly mailer: Mailer,
    private readonly settings: AuthSettings,
    private readonly logger: Logger,
  ) {}

  async create(userId: string, type: UserTokenType): Promise<string> {
    await this.userTokens.invalidateAll(userId, type);
    const token = randomToken();
    const ttl = type === 'password_reset' ? this.settings.passwordResetTtl : this.settings.emailVerificationTtl;
    await this.userTokens.create({ userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + parseDuration(ttl)) });
    return token;
  }

  /** Marks a valid token as used and returns it, or null when invalid / expired. */
  async consume(type: UserTokenType, token: string) {
    const record = await this.userTokens.findValid(type, sha256(token), new Date());
    if (record) await this.userTokens.markUsed(record.id);
    return record;
  }

  async sendEmailVerification(user: User): Promise<void> {
    const token = await this.create(user.id, 'email_verification');
    await this.mailer.send({
      to: user.email,
      subject: 'Verify your email address',
      text: `Hi ${user.name},\n\nConfirm your email address: ${this.settings.appUrl}/verify-email?token=${token}\n\nThe link expires in ${this.settings.emailVerificationTtl}.`,
    });
  }

  async sendPasswordReset(user: User): Promise<void> {
    const token = await this.create(user.id, 'password_reset');
    await this.mailer.send({
      to: user.email,
      subject: 'Reset your password',
      text: `Hi ${user.name},\n\nReset your password: ${this.settings.appUrl}/reset-password?token=${token}\n\nThe link expires in ${this.settings.passwordResetTtl}. If you didn't ask for it, ignore this email.`,
    });
    this.logger.info({ userId: user.id }, 'Password reset requested');
  }
}
