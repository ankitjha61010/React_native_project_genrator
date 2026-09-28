import type { AuthSession, LoginCredentials } from '{{IMPORT:auth.types}}';
{{#if HAS_SOCIAL_AUTH}}
import type { SocialAuthResult } from '{{IMPORT:auth.socialAuth}}';
{{/if}}

const DEMO_LATENCY_MS = 800;

export const authService = {
  /**
   * DEMO implementation: accepts any valid credentials and returns a fake session.
   * Replace with a real request, e.g.
   *
   *   import { api } from '{{IMPORT:api.client}}';
   *   return api.post<AuthSession>('/auth/login', credentials);
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    await new Promise<void>(resolve => setTimeout(() => resolve(), DEMO_LATENCY_MS));
    const email = credentials.email.trim().toLowerCase();
    return {
      token: 'demo-token',
      user: { id: 'demo-user', email, name: email.split('@')[0] ?? email },
    };
  },
{{#if HAS_SOCIAL_AUTH}}

  /**
   * DEMO implementation: trusts the provider result and returns a local session.
   * In production send the provider token to your backend, verify it there
   * (Google/Apple: JWT signature + audience, Facebook: debug_token) and return your
   * own session, e.g.
   *
   *   return api.post<AuthSession>('/auth/social', {
   *     provider: result.provider,
   *     token: result.token,
   *     tokenType: result.tokenType,
   *     authorizationCode: result.authorizationCode,
   *     nonce: result.nonce,
   *   });
   */
  async socialLogin(result: SocialAuthResult): Promise<AuthSession> {
    await new Promise<void>(resolve => setTimeout(() => resolve(), DEMO_LATENCY_MS));
    return {
      token: `demo-${result.provider}-token`,
      user: {
        id: result.user.id,
        email: result.user.email ?? '',
        name: result.user.name,
        avatar: result.user.photoUrl,
      },
    };
  },
{{/if}}
};
