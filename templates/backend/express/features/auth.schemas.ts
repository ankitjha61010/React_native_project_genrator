import { z } from 'zod';
{{#if AUTH_EMAIL}}
import { config } from '{{IMPORT:config.env}}';
{{/if}}
{{#if SOCIAL}}
import { SOCIAL_PROVIDERS } from '{{IMPORT:domain.authTokens}}';
{{/if}}
import { publicUserSchema } from '{{IMPORT:ex.users.schemas}}';

{{#if AUTH_EMAIL}}
const email = z.email('must be a valid email').max(255).meta({ example: 'jane@example.com' });

/** Mirrors assertPasswordPolicy (application layer) for early, per-field messages. */
const newPassword = z
  .string()
  .min(config.password.minLength, `must be at least ${config.password.minLength} characters`)
  .max(config.password.maxLength, `must be at most ${config.password.maxLength} characters`)
  .regex(/[a-z]/i, 'must contain a letter')
  .regex(/\d/, 'must contain a number')
  .meta({ example: 'Sup3rSecret' });

const anyPassword = z.string().min(1, 'is required').max(config.password.maxLength);
{{/if}}
{{#if AUTH_EMAIL}}
const code = z.string().trim().regex(/^\d{4,8}$/, 'must be the code you received').meta({ example: '123456' });
{{/if}}
const name = z.string().trim().min(1).max(120).meta({ example: 'Jane Doe' });
/** Dial code from the country picker, e.g. "+91". */
export const countryCode = z.string().trim().regex(/^\+?\d{1,4}$/, 'must be a dial code like +91').meta({ example: '+91' });
/** National number, e.g. "98765 43210" (spaces / dashes are ignored). */
export const phone = z.string().trim().regex(/^[\d\s-]{4,20}$/, 'must be a valid mobile number').meta({ example: '9876543210' });
{{#if AUTH_EMAIL}}

export const registerSchema = z
  .object({ name, email, password: newPassword, countryCode: countryCode.optional(), phone: phone.optional() })
  .refine(value => !value.phone || !!value.countryCode, { path: ['countryCode'], message: 'is required with phone' })
  .meta({ id: 'RegisterRequest' });

export const loginSchema = z.object({ email, password: anyPassword }).meta({ id: 'LoginRequest' });

export const changePasswordSchema = z
  .object({ currentPassword: anyPassword.optional().meta({ description: 'Not needed when the account has no password yet' }), newPassword })
  .meta({ id: 'ChangePasswordRequest' });

export const forgotPasswordSchema = z.object({ email }).meta({ id: 'ForgotPasswordRequest' });

export const resetPasswordSchema = z.object({ email, code, newPassword }).meta({ id: 'ResetPasswordRequest' });

export const verifyEmailSchema = z.object({ code }).meta({ id: 'VerifyEmailRequest' });
{{/if}}
{{#if AUTH_OTP}}

export const sendOtpSchema = z.object({ countryCode, phone }).meta({ id: 'SendOtpRequest' });

export const verifyOtpSchema = z
  .object({ countryCode, phone, otp: z.string().trim().regex(/^\d{6}$/, 'must be the 6-digit code').meta({ example: '123456' }), name: name.optional() })
  .meta({ id: 'VerifyOtpRequest' });
{{/if}}
{{#if SOCIAL}}

export const socialLoginSchema = z
  .object({
    provider: z.enum(SOCIAL_PROVIDERS),
    token: z.string().min(10).max(8192),
    tokenType: z.enum(['idToken', 'accessToken', 'authenticationToken', 'identityToken']),
    authorizationCode: z.string().max(2048).optional(),
    nonce: z.string().max(512).optional(),
    name: name.optional().meta({ description: 'Apple: the name the app received on the first sign-in' }),
  })
  .meta({ id: 'SocialLoginRequest' });
{{/if}}
{{#if AUTH_REFRESH}}

export const refreshTokenSchema = z.object({ refreshToken: z.string().min(1).max(2048) }).meta({ id: 'RefreshTokenRequest' });
{{/if}}

// ── responses (used by the OpenAPI document) ──────────────────────────────────

export const authTokensSchema = z
  .object({
    tokenType: z.literal('Bearer'),
    accessToken: z.string(),
    expiresIn: z.number().meta({ description: 'Access token lifetime in seconds' }),
    accessTokenExpiresAt: z.iso.datetime(),
{{#if AUTH_REFRESH}}
    refreshToken: z.string(),
    refreshTokenExpiresAt: z.iso.datetime(),
{{/if}}
  })
  .meta({ id: 'AuthTokens' });

export const sessionSchema = z
  .object({ user: publicUserSchema, tokens: authTokensSchema{{#if PASSWORDLESS}}, isNewUser: z.boolean().optional(){{/if}} })
  .meta({ id: 'AuthSession' });
{{#if CODES}}

export const sentCodeSchema = z
  .object({ expiresIn: z.number().meta({ description: 'Seconds until the code expires' }), resendIn: z.number().meta({ description: 'Seconds until a new code may be requested' }) })
  .meta({ id: 'SentCode' });
{{/if}}
