import type { AuthSession, LoginCredentials } from '{{IMPORT:auth.types}}';
{{#if HAS_SOCIAL_AUTH}}
import type { SocialAuthResult } from '{{IMPORT:auth.socialAuth}}';
{{/if}}

const DEMO_LATENCY_MS = 800;

/**
 * Data layer: knows WHERE data comes from (API, cache…), nothing about business rules.
 *
 * DEMO implementation. Replace with:
 *   import { api } from '{{IMPORT:api.client}}';
 *   return api.post<AuthSession>('/auth/login', credentials);
 */
export const authRepository = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    await new Promise<void>(resolve => setTimeout(() => resolve(), DEMO_LATENCY_MS));
    return {
      token: 'demo-token',
      user: { id: 'demo-user', email: credentials.email, name: credentials.email.split('@')[0] ?? credentials.email },
    };
  },
{{#if HAS_SOCIAL_AUTH}}

  /**
   * DEMO implementation: trusts the provider result and returns a local session.
   * In production send the token to your backend, verify it there and return your
   * own session, e.g. `api.post<AuthSession>('/auth/social', { provider, token, tokenType, authorizationCode, nonce })`.
   * See docs/SOCIAL_LOGIN.md for how to verify each provider's token.
   */
  async socialLogin(result: SocialAuthResult): Promise<AuthSession> {
    await new Promise<void>(resolve => setTimeout(() => resolve(), DEMO_LATENCY_MS));
    return {
      token: `demo-${result.provider}-token`,
      user: { id: result.user.id, email: result.user.email ?? '', name: result.user.name, avatar: result.user.photoUrl },
    };
  },
{{/if}}
};
