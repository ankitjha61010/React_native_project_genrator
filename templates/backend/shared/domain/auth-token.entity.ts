{{#if AUTH_REFRESH}}
/** A refresh token. Only its SHA-256 hash is stored; the id is the JWT `jti`. */
export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  /** All tokens created from one login share a family (used to detect token reuse). */
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
}

{{/if}}
export type UserTokenType = 'email_verification' | 'password_reset';

/** One-time token sent by email (verification / password reset). Stored hashed. */
export interface UserToken {
  id: string;
  userId: string;
  type: UserTokenType;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}
