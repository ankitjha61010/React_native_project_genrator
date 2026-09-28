{{#if AUTH_REFRESH}}
import { safeEqual, sha256 } from '{{IMPORT:core.crypto}}';
import type { RefreshTokensRepository } from '{{IMPORT:contract.refreshTokens}}';
import type { TokenService } from '{{IMPORT:port.tokenService}}';

/**
 * Ends the session of this refresh token (other devices stay signed in). Works without a
 * valid access token, so an app can always log out.
 */
export class LogoutUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly tokens: TokenService,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    try {
      const payload = this.tokens.verifyRefreshToken(refreshToken);
      const stored = await this.refreshTokens.findById(payload.jti);
      if (stored && safeEqual(stored.tokenHash, sha256(refreshToken))) await this.refreshTokens.revoke(stored.id);
    } catch {
      // Invalid / expired token – nothing to revoke.
    }
  }
}
{{else}}
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { SessionManager } from '{{IMPORT:uc.support}}';

/** Plain JWT mode has no per-device session: logging out invalidates every token of the user. */
export class LogoutUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly sessions: SessionManager,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (user) await this.sessions.revokeAll(user);
  }
}
{{/if}}
