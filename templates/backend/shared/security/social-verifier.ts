import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
{{#if SOCIAL_APPLE}}
import { sha256 } from '{{IMPORT:core.crypto}}';
{{/if}}
import { UnauthorizedError } from '{{IMPORT:core.errors}}';
import type { SocialProvider } from '{{IMPORT:domain.authTokens}}';
import type { SocialCredential, SocialProfile, SocialVerifier } from '{{IMPORT:port.socialVerifier}}';

export interface SocialConfig {
{{#if SOCIAL_GOOGLE}}
  googleClientIds: string[];
{{/if}}
{{#if SOCIAL_FACEBOOK}}
  facebookAppId: string;
  facebookAppSecret: string;
{{/if}}
{{#if SOCIAL_APPLE}}
  appleClientIds: string[];
{{/if}}
}

const invalid = (provider: string) => new UnauthorizedError(`Invalid ${provider} sign-in token`, 'INVALID_SOCIAL_TOKEN');
const text = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
{{#if SOCIAL_GOOGLE}}

const GOOGLE_KEYS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
{{/if}}
{{#if SOCIAL_APPLE}}
const APPLE_KEYS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
{{/if}}
{{#if SOCIAL_FACEBOOK}}
const FACEBOOK_KEYS = createRemoteJWKSet(new URL('https://limited.facebook.com/.well-known/oauth/openid/jwks/'));
{{/if}}

/**
 * Verifies social sign-in tokens with the providers:
{{#if SOCIAL_GOOGLE}}
 * - Google: ID token signed by Google, audience = one of GOOGLE_CLIENT_IDS.
{{/if}}
{{#if SOCIAL_FACEBOOK}}
 * - Facebook: access token checked with the Graph API (debug_token), or a Limited Login JWT.
{{/if}}
{{#if SOCIAL_APPLE}}
 * - Apple: identity token signed by Apple, audience = the bundle id, nonce checked.
{{/if}}
 */
export class ProviderSocialVerifier implements SocialVerifier {
  constructor(private readonly config: SocialConfig) {}

  verify(credential: SocialCredential): Promise<SocialProfile> {
    const verifiers: Record<SocialProvider, () => Promise<SocialProfile>> = {
{{#if SOCIAL_GOOGLE}}
      google: () => this.google(credential.token),
{{/if}}
{{#if SOCIAL_FACEBOOK}}
      facebook: () => (credential.tokenType === 'authenticationToken' ? this.facebookLimited(credential.token) : this.facebook(credential.token)),
{{/if}}
{{#if SOCIAL_APPLE}}
      apple: () => this.apple(credential.token, credential.nonce),
{{/if}}
    };
    return verifiers[credential.provider]();
  }
{{#if SOCIAL_GOOGLE}}

  private async google(idToken: string): Promise<SocialProfile> {
    if (!this.config.googleClientIds.length) throw new UnauthorizedError('Google sign-in is not configured (GOOGLE_CLIENT_IDS)', 'SOCIAL_NOT_CONFIGURED');
    const claims = await this.jwt(idToken, GOOGLE_KEYS, ['https://accounts.google.com', 'accounts.google.com'], this.config.googleClientIds, 'Google');
    return {
      provider: 'google',
      providerUserId: String(claims.sub),
      email: text(claims.email),
      emailVerified: claims.email_verified === true,
      name: text(claims.name),
      avatarUrl: text(claims.picture),
    };
  }
{{/if}}
{{#if SOCIAL_FACEBOOK}}

  private async facebook(accessToken: string): Promise<SocialProfile> {
    const { facebookAppId: appId, facebookAppSecret: secret } = this.config;
    if (!appId || !secret) throw new UnauthorizedError('Facebook sign-in is not configured (FACEBOOK_APP_ID / SECRET)', 'SOCIAL_NOT_CONFIGURED');
    const graph = 'https://graph.facebook.com/v21.0';
    const debug = await fetch(`${graph}/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${appId}|${secret}`);
    const check = (await debug.json()) as { data?: { is_valid?: boolean; app_id?: string; user_id?: string } };
    if (!debug.ok || !check.data?.is_valid || check.data.app_id !== appId || !check.data.user_id) throw invalid('Facebook');

    const me = await fetch(`${graph}/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`);
    const profile = (await me.json()) as { id?: string; name?: string; email?: string; picture?: { data?: { url?: string } } };
    if (!me.ok || profile.id !== check.data.user_id) throw invalid('Facebook');
    // Facebook only returns confirmed emails.
    return { provider: 'facebook', providerUserId: profile.id, email: text(profile.email), emailVerified: !!profile.email, name: text(profile.name), avatarUrl: text(profile.picture?.data?.url) };
  }

  /** iOS Limited Login returns an OIDC token instead of an access token. */
  private async facebookLimited(token: string): Promise<SocialProfile> {
    if (!this.config.facebookAppId) throw new UnauthorizedError('Facebook sign-in is not configured (FACEBOOK_APP_ID)', 'SOCIAL_NOT_CONFIGURED');
    const claims = await this.jwt(token, FACEBOOK_KEYS, ['https://www.facebook.com', 'https://limited.facebook.com'], [this.config.facebookAppId], 'Facebook');
    return { provider: 'facebook', providerUserId: String(claims.sub), email: text(claims.email), emailVerified: !!claims.email, name: text(claims.name), avatarUrl: text(claims.picture) };
  }
{{/if}}
{{#if SOCIAL_APPLE}}

  private async apple(identityToken: string, nonce?: string): Promise<SocialProfile> {
    const claims = await this.jwt(identityToken, APPLE_KEYS, ['https://appleid.apple.com'], this.config.appleClientIds, 'Apple');
    // The token carries SHA-256(nonce) – it binds the token to this sign-in attempt.
    if (claims.nonce !== undefined && (!nonce || (claims.nonce !== sha256(nonce) && claims.nonce !== nonce))) throw invalid('Apple');
    return {
      provider: 'apple',
      providerUserId: String(claims.sub),
      email: text(claims.email),
      emailVerified: claims.email_verified === true || claims.email_verified === 'true',
      // Apple never puts the name in the token; the app sends it on the first sign-in.
      name: null,
      avatarUrl: null,
    };
  }
{{/if}}

  private async jwt(token: string, keys: ReturnType<typeof createRemoteJWKSet>, issuer: string[], audience: string[], provider: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, keys, { issuer, audience });
      if (!payload.sub) throw invalid(provider);
      return payload;
    } catch {
      throw invalid(provider);
    }
  }
}
