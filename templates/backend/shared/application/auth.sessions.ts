{{#if AUTH_REFRESH}}
import { newId, safeEqual, sha256 } from '{{IMPORT:core.crypto}}';
{{/if}}
import { NotFoundError, UnauthorizedError } from '{{IMPORT:core.errors}}';
{{#if AUTH_ROTATION}}
import type { Logger } from '{{IMPORT:core.logger}}';
{{/if}}
import type { User } from '{{IMPORT:domain.user}}';
{{#if AUTH_REFRESH}}
import type { RefreshTokensRepository } from '{{IMPORT:contract.auth}}';
{{/if}}
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { TokenService } from '{{IMPORT:port.tokenService}}';
import type { AccessTokens, {{#if AUTH_REFRESH}}AuthResult, {{/if}}AuthTokens, ClientContext } from '{{IMPORT:app.authTypes}}';

const INVALID_SESSION = () => new UnauthorizedError('Your session is no longer valid, please log in again', 'SESSION_REVOKED');

/**
 * Sessions = tokens. Issues access tokens{{#if AUTH_REFRESH}} + refresh tokens (stored hashed){{/if}}, resolves the
 * user behind an access token and revokes sessions.
 */
export class Sessions {
  constructor(
    private readonly users: UsersRepository,
{{#if AUTH_REFRESH}}
    private readonly refreshTokens: RefreshTokensRepository,
{{/if}}
    private readonly tokens: TokenService,
{{#if AUTH_ROTATION}}
    private readonly logger: Logger,
{{/if}}
  ) {}

{{#if AUTH_REFRESH}}
  async issue(user: User, client: ClientContext): Promise<AuthTokens> {
    const refresh = await this.createRefreshToken(user, client);
    return { ...this.accessToken(user), refreshToken: refresh.token, refreshTokenExpiresAt: refresh.expiresAt.toISOString() };
  }

{{#if AUTH_ROTATION}}
  /** New token pair for a refresh token; the used one is revoked (rotation). Reusing it revokes the whole family. */
{{else}}
  /** New access token for a refresh token (the refresh token stays valid until it expires). */
{{/if}}
  async refresh(refreshToken: string, {{#if AUTH_ROTATION}}client{{else}}_client{{/if}}: ClientContext = {}): Promise<AuthResult> {
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
    if (stored.expiresAt <= new Date()) throw new UnauthorizedError('Refresh token expired', 'TOKEN_EXPIRED');

    const user = await this.users.findById(stored.userId);
    if (!user?.isActive) {
      await this.refreshTokens.revoke(stored.id);
      throw INVALID_SESSION();
    }
{{#if AUTH_ROTATION}}
    const next = await this.createRefreshToken(user, client, stored.familyId);
    await this.refreshTokens.revoke(stored.id, next.id);
    return { user, tokens: { ...this.accessToken(user), refreshToken: next.token, refreshTokenExpiresAt: next.expiresAt.toISOString() } };
{{else}}
    return { user, tokens: { ...this.accessToken(user), refreshToken, refreshTokenExpiresAt: stored.expiresAt.toISOString() } };
{{/if}}
  }

  /** Ends the session of this refresh token (other devices stay signed in). Never fails. */
  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.tokens.verifyRefreshToken(refreshToken);
      const stored = await this.refreshTokens.findById(payload.jti);
      if (stored && safeEqual(stored.tokenHash, sha256(refreshToken))) await this.refreshTokens.revoke(stored.id);
    } catch {
      // Invalid / expired token – nothing to revoke.
    }
  }
{{else}}
  async issue(user: User, _client: ClientContext): Promise<AuthTokens> {
    return this.accessToken(user);
  }
{{/if}}

  /** Resolves the user behind an access token (auth guard / middleware / socket handshake). */
  async authenticate(accessToken: string): Promise<User> {
    const payload = this.tokens.verifyAccessToken(accessToken);
    const user = await this.users.findById(payload.sub);
    if (!user?.isActive || user.tokenVersion !== payload.tv) throw INVALID_SESSION();
    return user;
  }

  /** Invalidates every access token (token version) {{#if AUTH_REFRESH}}and refresh token {{/if}}of the user. */
  async revokeAll(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    await this.users.update(userId, { tokenVersion: user.tokenVersion + 1 });
{{#if AUTH_REFRESH}}
    await this.refreshTokens.revokeAllForUser(userId);
{{/if}}
  }

  private accessToken(user: User): AccessTokens {
    const access = this.tokens.signAccessToken({ sub: user.id, role: user.role, tv: user.tokenVersion });
    return { tokenType: 'Bearer', accessToken: access.token, expiresIn: access.expiresIn, accessTokenExpiresAt: access.expiresAt.toISOString() };
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
    return { token: signed.token, id, expiresAt: signed.expiresAt };
  }
{{/if}}
}
