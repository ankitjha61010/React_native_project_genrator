import { ValidationError } from '{{IMPORT:core.errors}}';
import type { User } from '{{IMPORT:domain.user}}';

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
}

/** Who is calling – stored with refresh tokens and used in security logs. */
export interface ClientContext {
  ip?: string;
  userAgent?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AuthSettings {
  appUrl: string;
  passwordResetTtl: string;
  emailVerificationTtl: string;
  password: { minLength: number; maxLength: number };
{{#if SEC_LOCKOUT}}
  lockout: { maxAttempts: number; minutes: number };
{{/if}}
}

/**
 * Password rules enforced by the application (the request validation mirrors them for
 * nicer messages, but these always run).
 */
export function assertPasswordPolicy(password: string, rules: AuthSettings['password'], field = 'password'): void {
  const problems: string[] = [];
  if (password.length < rules.minLength) problems.push(`must be at least ${rules.minLength} characters`);
  if (Buffer.byteLength(password) > rules.maxLength) problems.push(`must be at most ${rules.maxLength} bytes`);
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) problems.push('must contain letters and numbers');
  if (problems.length) throw new ValidationError(problems.map(message => ({ field, message: `Password ${message}` })));
}
