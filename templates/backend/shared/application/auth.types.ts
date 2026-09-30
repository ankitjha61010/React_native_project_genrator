{{#if AUTH_EMAIL}}
import { ValidationError } from '{{IMPORT:core.errors}}';
import { AUTH_MESSAGES } from '{{IMPORT:messages.auth}}';
{{/if}}
{{#if SOCIAL}}
import type { SocialProvider } from '{{IMPORT:domain.authTokens}}';
{{/if}}
{{#if DEVICE_INPUT}}
import type { DeviceInput } from '{{IMPORT:domain.device}}';
{{/if}}
import { toPublicUser, type PublicUser, type User } from '{{IMPORT:domain.user}}';

export interface AuthTokens {
  tokenType: 'Bearer';
  accessToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  accessTokenExpiresAt: string;
{{#if AUTH_REFRESH}}
  refreshToken: string;
  refreshTokenExpiresAt: string;
{{/if}}
}

/** The access-token half of `AuthTokens`. */
export type AccessTokens = Pick<AuthTokens, 'tokenType' | 'accessToken' | 'expiresIn' | 'accessTokenExpiresAt'>;

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
{{#if PASSWORDLESS}}
  /** True when this sign-in created the account (show onboarding). */
  isNewUser?: boolean;
{{/if}}
}

/** The response of every sign-in endpoint. */
export interface SessionView {
  user: PublicUser;
  tokens: AuthTokens;
{{#if PASSWORDLESS}}
  isNewUser?: boolean;
{{/if}}
}

export function toSessionView(result: AuthResult): SessionView {
  return { user: toPublicUser(result.user), tokens: result.tokens{{#if PASSWORDLESS}}, ...(result.isNewUser ? { isNewUser: true } : {}){{/if}} };
}

/** Who is calling – stored with refresh tokens and used in security logs. */
export interface ClientContext {
  ip?: string;
  userAgent?: string;
{{#if DEVICE_INPUT}}
  /** The app install signing in (the request body's `device`) – saved with the sign-in. */
  device?: DeviceInput;
{{/if}}
}
{{#if AUTH_EMAIL}}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  countryCode?: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  /** Not needed when the account has no password yet (mobile / social sign-in). */
  currentPassword?: string;
  newPassword: string;
}

export interface ResetPasswordInput {
  email: string;
  code: string;
  newPassword: string;
}
{{/if}}
{{#if AUTH_OTP}}

export interface PhoneInput {
  countryCode: string;
  phone: string;
}

export interface VerifyOtpInput extends PhoneInput {
  otp: string;
  /** Used when this creates the account. */
  name?: string;
}
{{/if}}
{{#if SOCIAL}}

export interface SocialLoginInput {
  provider: SocialProvider;
  token: string;
  tokenType: 'idToken' | 'accessToken' | 'authenticationToken' | 'identityToken';
  authorizationCode?: string;
  nonce?: string;
  /** Apple only sends the name to the app, on the first sign-in. */
  name?: string;
}
{{/if}}

export interface AuthSettings {
  appName: string;
{{#if CODES}}
  codes: { ttl: string; resendAfter: string; maxAttempts: number };
{{/if}}
{{#if AUTH_EMAIL}}
  password: { minLength: number; maxLength: number };
{{/if}}
{{#if SEC_LOCKOUT}}
  lockout: { maxAttempts: number; minutes: number };
{{/if}}
}
{{#if AUTH_EMAIL}}

/**
 * Password rules enforced by the application (request validation mirrors them for nicer
 * messages, but these always run).
 */
export function assertPasswordPolicy(password: string, rules: AuthSettings['password'], field = 'password'): void {
  const problems: string[] = [];
  if (password.length < rules.minLength) problems.push(AUTH_MESSAGES.passwordTooShort(rules.minLength));
  if (Buffer.byteLength(password) > rules.maxLength) problems.push(AUTH_MESSAGES.passwordTooLong(rules.maxLength));
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) problems.push(AUTH_MESSAGES.passwordTooWeak);
  if (problems.length) throw new ValidationError(problems.map(message => ({ field, message })));
}
{{/if}}
