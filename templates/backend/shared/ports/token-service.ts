import type { UserRole } from '{{IMPORT:domain.roles}}';

export interface AccessTokenPayload {
  /** User id. */
  sub: string;
  role: UserRole;
  /** User token version – tokens with an older version are rejected. */
  tv: number;
}
{{#if AUTH_REFRESH}}

export interface RefreshTokenPayload {
  sub: string;
  /** Id of the stored refresh token. */
  jti: string;
  /** Token family id. */
  fam: string;
}
{{/if}}

export interface SignedToken {
  token: string;
  expiresAt: Date;
  /** Lifetime in seconds. */
  expiresIn: number;
}

export interface TokenService {
  signAccessToken(payload: AccessTokenPayload): SignedToken;
  /** Throws UnauthorizedError when invalid or expired. */
  verifyAccessToken(token: string): AccessTokenPayload;
{{#if AUTH_REFRESH}}
  signRefreshToken(payload: RefreshTokenPayload): SignedToken;
  /** Throws UnauthorizedError when invalid or expired. */
  verifyRefreshToken(token: string): RefreshTokenPayload;
{{/if}}
}
