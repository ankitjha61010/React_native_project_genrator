import type { RefreshToken } from '{{IMPORT:domain.authTokens}}';

export type CreateRefreshTokenData = Pick<RefreshToken, 'id' | 'userId' | 'tokenHash' | 'familyId' | 'expiresAt'> &
  Partial<Pick<RefreshToken, 'userAgent' | 'ip'>>;

export interface RefreshTokensRepository {
  create(data: CreateRefreshTokenData): Promise<RefreshToken>;
  findById(id: string): Promise<RefreshToken | null>;
  /** Marks one token revoked (optionally recording the token that replaced it). */
  revoke(id: string, replacedById?: string): Promise<void>;
  /** Revokes every token of a family – used when a revoked token is reused. */
  revokeFamily(familyId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  /** Housekeeping: deletes tokens that expired before `before`. Returns the count. */
  deleteExpired(before: Date): Promise<number>;
}
