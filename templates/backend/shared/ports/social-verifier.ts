import type { SocialProvider } from '{{IMPORT:domain.authTokens}}';

/** What the app sends after the provider's SDK signed the user in. */
export interface SocialCredential {
  provider: SocialProvider;
  token: string;
  tokenType: 'idToken' | 'accessToken' | 'authenticationToken' | 'identityToken';
  /** Apple: nonce the app passed to Sign in with Apple (checked against the token). */
  nonce?: string;
}

/** The verified identity behind a social token. */
export interface SocialProfile {
  provider: SocialProvider;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
}

/** Verifies tokens with the provider (signature, audience, expiry) – never trusts the app. */
export interface SocialVerifier {
  /** Throws UnauthorizedError when the token is invalid. */
  verify(credential: SocialCredential): Promise<SocialProfile>;
}
