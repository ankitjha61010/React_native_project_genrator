import type { AuthSession, LoginCredentials } from '{{IMPORT:auth.types}}';
{{#if HAS_SOCIAL_AUTH}}
import type { SocialAuthResult } from '{{IMPORT:auth.socialAuth}}';
{{/if}}

/** Domain contract. Implemented in the data layer (AuthRepositoryImpl). */
export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<AuthSession>;
{{#if HAS_SOCIAL_AUTH}}
  /** Exchanges a provider credential (Google / Facebook / Apple) for an app session. */
  socialLogin(result: SocialAuthResult): Promise<AuthSession>;
{{/if}}
}
