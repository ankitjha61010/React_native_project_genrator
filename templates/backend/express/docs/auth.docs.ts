import type { ApiDocGroup } from '{{IMPORT:ex.docs.helpers}}';
import {
{{#if AUTH_EMAIL}}
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
{{/if}}
{{#if CODES}}
  sentCodeSchema,
{{/if}}
{{#if AUTH_OTP}}
  sendOtpSchema,
  verifyOtpSchema,
{{/if}}
{{#if SOCIAL}}
  socialLoginSchema,
{{/if}}
{{#if AUTH_REFRESH}}
  refreshTokenSchema,
{{/if}}
  sessionSchema,
} from '{{IMPORT:ex.auth.schemas}}';
import { publicUserSchema } from '{{IMPORT:ex.users.schemas}}';

/** Swagger docs of auth.routes.ts. */
export const authDocs: ApiDocGroup = {
  tag: 'Auth',
  endpoints: [
{{#if AUTH_EMAIL}}
    { method: 'post', path: '/auth/register', summary: 'Create an account with email + password (a verification code is emailed)', status: 201, body: registerSchema, response: sessionSchema, errors: [409, 422, 429] },
    { method: 'post', path: '/auth/login', summary: 'Log in with email + password', body: loginSchema, response: sessionSchema, errors: [401, 403{{#if SEC_LOCKOUT}}, 423{{/if}}, 422, 429] },
{{/if}}
{{#if AUTH_OTP}}
    { method: 'post', path: '/auth/otp/send', summary: 'Text a 6-digit login code to a mobile number', body: sendOtpSchema, response: sentCodeSchema, errors: [422, 429] },
    { method: 'post', path: '/auth/otp/verify', summary: 'Sign in with the SMS code (creates the account on the first login)', body: verifyOtpSchema, response: sessionSchema, errors: [400, 403, 422, 429] },
{{/if}}
{{#if SOCIAL}}
    { method: 'post', path: '/auth/social', summary: 'Sign in with {{SOCIAL_PROVIDERS_TEXT}} (the token from the provider SDK is verified with the provider)', body: socialLoginSchema, response: sessionSchema, errors: [401, 403, 422, 429] },
{{/if}}
{{#if AUTH_REFRESH}}
{{#if AUTH_ROTATION}}
    { method: 'post', path: '/auth/refresh', summary: 'New token pair for a refresh token (the used one is revoked; reusing it revokes the whole session)', body: refreshTokenSchema, response: sessionSchema, errors: [401, 422, 429] },
{{else}}
    { method: 'post', path: '/auth/refresh', summary: 'New access token for a refresh token', body: refreshTokenSchema, response: sessionSchema, errors: [401, 422, 429] },
{{/if}}
    { method: 'post', path: '/auth/logout', summary: 'End the session of a refresh token', body: refreshTokenSchema, errors: [422] },
    { method: 'post', path: '/auth/logout-all', summary: 'Log out on every device', auth: true, errors: [401] },
{{else}}
    { method: 'post', path: '/auth/logout', summary: 'Log out (invalidates every token of the user)', auth: true, errors: [401] },
{{/if}}
    { method: 'get', path: '/auth/me', summary: 'The signed-in user', auth: true, response: publicUserSchema, errors: [401] },
{{#if AUTH_EMAIL}}
    { method: 'post', path: '/auth/change-password', summary: 'Change (or set) the password – other sessions are signed out', auth: true, body: changePasswordSchema, response: sessionSchema, errors: [400, 401, 422, 429] },
    { method: 'post', path: '/auth/forgot-password', summary: 'Email a 6-digit password reset code (always succeeds)', body: forgotPasswordSchema, errors: [422, 429] },
    { method: 'post', path: '/auth/reset-password', summary: 'Set a new password with the emailed code', body: resetPasswordSchema, errors: [400, 422, 429] },
    { method: 'post', path: '/auth/verify-email/request', summary: 'Email a verification code', auth: true, response: sentCodeSchema, errors: [400, 401, 409, 429] },
    { method: 'post', path: '/auth/verify-email', summary: 'Confirm the email address with the emailed code', auth: true, body: verifyEmailSchema, response: publicUserSchema, errors: [400, 401, 422, 429] },
{{/if}}
  ],
};
