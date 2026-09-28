import type { UserToken, UserTokenType } from '{{IMPORT:domain.authTokens}}';

export interface UserTokensRepository {
  create(data: Pick<UserToken, 'userId' | 'type' | 'tokenHash' | 'expiresAt'>): Promise<UserToken>;
  /** An unused, unexpired token with this hash. */
  findValid(type: UserTokenType, tokenHash: string, now: Date): Promise<UserToken | null>;
  markUsed(id: string): Promise<void>;
  /** Invalidates every open token of a type (e.g. older reset links). */
  invalidateAll(userId: string, type: UserTokenType): Promise<void>;
}
