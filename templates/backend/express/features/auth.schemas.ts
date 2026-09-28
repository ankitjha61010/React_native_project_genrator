import { z } from 'zod';
import { config } from '{{IMPORT:config.env}}';

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

export const registerSchema = z
  .object({ email, password: newPassword, name: z.string().trim().min(1).max(120).meta({ example: 'Jane Doe' }) })
  .meta({ id: 'RegisterRequest' });

export const loginSchema = z.object({ email, password: anyPassword }).meta({ id: 'LoginRequest' });
{{#if AUTH_REFRESH}}

export const refreshTokenSchema = z.object({ refreshToken: z.string().min(1).max(2048) }).meta({ id: 'RefreshTokenRequest' });
{{/if}}

export const changePasswordSchema = z
  .object({ currentPassword: anyPassword, newPassword })
  .meta({ id: 'ChangePasswordRequest' });

export const forgotPasswordSchema = z.object({ email }).meta({ id: 'ForgotPasswordRequest' });

export const resetPasswordSchema = z
  .object({ token: z.string().min(1).max(512), newPassword })
  .meta({ id: 'ResetPasswordRequest' });

export const verifyEmailSchema = z.object({ token: z.string().min(1).max(512) }).meta({ id: 'VerifyEmailRequest' });

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
