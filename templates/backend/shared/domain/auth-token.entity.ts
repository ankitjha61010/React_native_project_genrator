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
{{#if CODES}}
/** What a 6-digit code proves. */
export type CodePurpose = {{CODE_PURPOSES}};

/**
 * A one-time code sent by email or SMS. Only its hash is stored, and it dies after a few
 * wrong attempts, so short codes can't be brute-forced.
 */
export interface VerificationCode {
  id: string;
  purpose: CodePurpose;
  /** Normalized email, or "+<countryCode><phone>". */
  target: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}
{{/if}}
{{#if SOCIAL}}

export const SOCIAL_PROVIDERS = [{{SOCIAL_PROVIDER_LIST}}] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

/** Links a user to an account at Google / Facebook / Apple. */
export interface SocialAccount {
  id: string;
  userId: string;
  provider: SocialProvider;
  /** The provider's user id (`sub`). */
  providerUserId: string;
  email: string | null;
  createdAt: Date;
}
{{/if}}
