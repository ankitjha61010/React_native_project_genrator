import { safeEqual, sha256 } from '{{IMPORT:core.crypto}}';
import { UnauthorizedError } from '{{IMPORT:core.errors}}';
{{#if AUTH_ROTATION}}
import type { Logger } from '{{IMPORT:core.logger}}';
{{/if}}
import type { RefreshTokensRepository } from '{{IMPORT:contract.refreshTokens}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { TokenService } from '{{IMPORT:port.tokenService}}';
import type { AuthResult, ClientContext } from '{{IMPORT:app.authTypes}}';
import type { SessionManager } from '{{IMPORT:uc.support}}';

{{#if AUTH_ROTATION}}
/** Exchanges a refresh token for a new token pair and revokes the used one (rotation + reuse detection). */
{{else}}
/** Exchanges a refresh token for a new access token (the refresh token stays valid until it expires). */
{{/if}}
export class RefreshSessionUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly tokens: TokenService,
    private readonly sessions: SessionManager,
{{#if AUTH_ROTATION}}
    private readonly logger: Logger,
{{/if}}
  ) {}

  async execute(refreshToken: string, {{#if AUTH_ROTATION}}client{{else}}_client{{/if}}: ClientContext = {}): Promise<AuthResult> {
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
    if (!user || !user.isActive) {
      await this.refreshTokens.revoke(stored.id);
      throw new UnauthorizedError('Your session is no longer valid, please log in again', 'SESSION_REVOKED');
    }
{{#if AUTH_ROTATION}}

    const { tokens, refreshTokenId } = await this.sessions.issueWithId(user, client, stored.familyId);
    await this.refreshTokens.revoke(stored.id, refreshTokenId);
    return { user, tokens };
{{else}}
    return { user, tokens: { ...this.sessions.accessToken(user), refreshToken, refreshTokenExpiresAt: stored.expiresAt.toISOString() } };
{{/if}}
  }
}
