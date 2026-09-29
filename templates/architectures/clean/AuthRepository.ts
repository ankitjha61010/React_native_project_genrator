{{#if AUTH_MOBILE}}
import type { SentCode } from '{{IMPORT:api.auth}}';
{{/if}}
import type { AuthSession, LoginCredentials, {{#if AUTH_EMAIL}}RegisterInput, {{/if}}{{#if AUTH_MOBILE}}PhoneNumber, {{/if}}User } from '{{IMPORT:auth.types}}';
{{#if HAS_SOCIAL_AUTH}}
import type { SocialAuthResult } from '{{IMPORT:auth.socialAuth}}';
{{/if}}

/** Domain contract. Implemented in the data layer (AuthRepositoryImpl). */
export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<AuthSession>;
{{#if AUTH_EMAIL}}
  register(input: RegisterInput): Promise<AuthSession>;
  forgotPassword(email: string): Promise<null>;
  resetPassword(input: { email: string; code: string; newPassword: string }): Promise<null>;
{{/if}}
{{#if AUTH_MOBILE}}
  sendOtp(phone: PhoneNumber): Promise<SentCode>;
  verifyOtp(input: PhoneNumber & { otp: string; name?: string }): Promise<AuthSession>;
{{/if}}
{{#if HAS_SOCIAL_AUTH}}
  /** Exchanges a provider credential (Google / Facebook / Apple) for an app session. */
  socialLogin(result: SocialAuthResult): Promise<AuthSession>;
{{/if}}
  me(): Promise<User>;
  /** Ends this device's session on the server. */
  logout(refreshToken?: string): Promise<null>;
}
