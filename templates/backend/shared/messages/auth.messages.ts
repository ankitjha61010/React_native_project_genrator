{{#if CODES}}
import type { ErrorMessage } from '{{IMPORT:core.messages}}';
{{else}}
{{#if SOCIAL}}
import type { ErrorMessage } from '{{IMPORT:core.messages}}';
{{/if}}
{{/if}}

/** Every message of the auth feature – change the wording here. */
export const AUTH_MESSAGES = {
{{#if AUTH_API}}
{{#if AUTH_EMAIL}}
  registered: 'Registered successfully',
{{/if}}
  loggedIn: 'Logged in successfully',
{{#if AUTH_REFRESH}}
  tokenRefreshed: 'Token refreshed',
{{/if}}
  loggedOut: 'Logged out',
  loggedOutEverywhere: 'Logged out on all devices',
  currentUser: 'Current user',
{{#if AUTH_EMAIL}}
  passwordChanged: 'Password changed',
  resetCodeSent: 'If the email is registered, a reset code has been sent',
  passwordReset: 'Password has been reset, please log in',
  verificationCodeSent: 'Verification code sent',
  emailVerified: 'Email verified',
{{/if}}
{{#if AUTH_OTP}}
  codeSent: 'Code sent',
{{/if}}
{{/if}}
  // ── errors ─────────────────────────────────────────────────────────────────
  missingToken: { message: 'Missing bearer token', code: 'MISSING_TOKEN' },
  invalidToken: { message: 'Invalid token', code: 'INVALID_TOKEN' },
  invalidAccessToken: { message: 'Invalid access token', code: 'INVALID_TOKEN' },
  tokenExpired: { message: 'Token expired', code: 'TOKEN_EXPIRED' },
  sessionRevoked: { message: 'Your session is no longer valid, please log in again', code: 'SESSION_REVOKED' },
{{#if AUTH_REFRESH}}
  invalidRefreshToken: { message: 'Invalid refresh token', code: 'INVALID_TOKEN' },
  refreshTokenReused: { message: 'Refresh token reuse detected, please log in again', code: 'TOKEN_REUSED' },
  refreshTokenRevoked: { message: 'Refresh token has been revoked', code: 'TOKEN_REVOKED' },
  refreshTokenExpired: { message: 'Refresh token expired', code: 'TOKEN_EXPIRED' },
{{/if}}
{{#if AUTH_API}}
  accountDisabled: { message: 'This account has been disabled', code: 'ACCOUNT_DISABLED' },
{{#if AUTH_EMAIL}}
  invalidCredentials: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
  emailTaken: { message: 'Email is already registered', code: 'EMAIL_TAKEN' },
  wrongCurrentPassword: { message: 'Current password is incorrect', code: 'INVALID_CURRENT_PASSWORD' },
  passwordUnchanged: { message: 'The new password must be different', code: 'PASSWORD_UNCHANGED' },
  noEmail: { message: 'The account has no email address', code: 'NO_EMAIL' },
  emailAlreadyVerified: { message: 'Email is already verified', code: 'EMAIL_ALREADY_VERIFIED' },
  passwordTooShort: (min: number) => `Password must be at least ${min} characters`,
  passwordTooLong: (max: number) => `Password must be at most ${max} bytes`,
  passwordTooWeak: 'Password must contain letters and numbers',
{{/if}}
{{#if SEC_LOCKOUT}}
  accountLocked: { message: 'Too many failed login attempts. The account is temporarily locked.', code: 'ACCOUNT_LOCKED' },
{{/if}}
{{/if}}
{{#if CODES}}
  invalidCode: { message: 'The code is invalid or has expired, please request a new one', code: 'INVALID_CODE' },
  wrongCode: (attemptsLeft: number): ErrorMessage => ({
    message: attemptsLeft > 0 ? `Wrong code, ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left` : 'Wrong code, please request a new one',
    code: 'INVALID_CODE',
  }),
  resendTooSoon: (seconds: number): ErrorMessage => ({ message: `Please wait ${seconds} seconds before requesting a new code`, code: 'CODE_RESEND_TOO_SOON' }),
{{/if}}
{{#if SOCIAL}}
  invalidSocialToken: (provider: string): ErrorMessage => ({ message: `Invalid ${provider} sign-in token`, code: 'INVALID_SOCIAL_TOKEN' }),
  socialNotConfigured: (provider: string, setting: string): ErrorMessage => ({ message: `${provider} sign-in is not configured (${setting})`, code: 'SOCIAL_NOT_CONFIGURED' }),
  socialAccountLinked: { message: 'This account is already linked', code: 'SOCIAL_ACCOUNT_LINKED' },
{{/if}}
} as const;
