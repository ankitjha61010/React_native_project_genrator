{{#if AUTH_REFRESH}}
import type { {{#if CODES}}CodePurpose, {{/if}}RefreshToken{{#if SOCIAL}}, SocialAccount, SocialProvider{{/if}}{{#if CODES}}, VerificationCode{{/if}} } from '{{IMPORT:domain.authTokens}}';
{{else}}
import type { {{#if CODES}}CodePurpose, VerificationCode{{/if}}{{#if CODES}}{{#if SOCIAL}}, {{/if}}{{/if}}{{#if SOCIAL}}SocialAccount, SocialProvider{{/if}} } from '{{IMPORT:domain.authTokens}}';
{{/if}}
{{#if AUTH_REFRESH}}

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
{{/if}}
{{#if CODES}}

export interface VerificationCodesRepository {
  create(data: Pick<VerificationCode, 'purpose' | 'target' | 'codeHash' | 'expiresAt'>): Promise<VerificationCode>;
  /** The newest unused, unexpired code for this purpose + target. */
  findActive(purpose: CodePurpose, target: string, now: Date): Promise<VerificationCode | null>;
  /** The newest code (used or not) – to throttle resends. */
  findLatest(purpose: CodePurpose, target: string): Promise<VerificationCode | null>;
  incrementAttempts(id: string): Promise<void>;
  markUsed(id: string): Promise<void>;
  /** Invalidates every open code of a purpose + target (e.g. when a new one is sent). */
  invalidateAll(purpose: CodePurpose, target: string): Promise<void>;
}
{{/if}}
{{#if SOCIAL}}

export interface SocialAccountsRepository {
  find(provider: SocialProvider, providerUserId: string): Promise<SocialAccount | null>;
  create(data: Pick<SocialAccount, 'userId' | 'provider' | 'providerUserId' | 'email'>): Promise<SocialAccount>;
}
{{/if}}
