import { authRepository } from '{{IMPORT:data.authRepository}}';
import type { AuthSession, LoginCredentials } from '{{IMPORT:auth.types}}';
{{#if HAS_SOCIAL_AUTH}}
import type { SocialAuthResult } from '{{IMPORT:auth.socialAuth}}';
{{/if}}

/** Business layer: rules around authentication. Talks to the data layer only. */
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const normalized = { ...credentials, email: credentials.email.trim().toLowerCase() };
    return authRepository.login(normalized);
  },
{{#if HAS_SOCIAL_AUTH}}

  /** Exchanges a verified provider credential for an app session (see docs/SOCIAL_LOGIN.md). */
  async socialLogin(result: SocialAuthResult): Promise<AuthSession> {
    return authRepository.socialLogin(result);
  },
{{/if}}
};
