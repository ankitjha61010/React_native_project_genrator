{{#if VIEWS}}
import { authView } from '{{IMPORT:views.auth}}';
import { userView } from '{{IMPORT:views.user}}';
{{else}}
import { toPublicUser } from '{{IMPORT:domain.user}}';
import { toSessionView } from '{{IMPORT:app.authTypes}}';
{{/if}}
import { emptySchema } from '{{IMPORT:ex.schemas}}';
import { route, type RouteGroup } from '{{IMPORT:ex.route}}';
import { publicUserSchema } from '{{IMPORT:ex.users.schemas}}';
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

{{#if VIEWS}}
const session = authView.session;
const publicUser = userView.one;
{{else}}
const session = toSessionView;
const publicUser = toPublicUser;
{{/if}}

/** `/auth` – {{AUTH_METHODS_TEXT}}, sessions. */
export const authRoutes: RouteGroup = {
  prefix: '/auth',
  tag: 'Auth',
  routes: [
{{#if AUTH_EMAIL}}
    route({
      method: 'post',
      path: '/register',
      summary: 'Create an account with email + password (a verification code is emailed)',
      message: 'Registered successfully',
      status: 201,
      limited: true,
      body: registerSchema,
      response: sessionSchema,
      errors: [409, 422, 429],
      handler: async ({ body, client }, { auth }) => session(await auth.register(body, client)),
    }),
    route({
      method: 'post',
      path: '/login',
      summary: 'Log in with email + password',
      message: 'Logged in successfully',
      limited: true,
      body: loginSchema,
      response: sessionSchema,
      errors: [401, 403{{#if SEC_LOCKOUT}}, 423{{/if}}, 422, 429],
      handler: async ({ body, client }, { auth }) => session(await auth.login(body, client)),
    }),
{{/if}}
{{#if AUTH_OTP}}
    route({
      method: 'post',
      path: '/otp/send',
      summary: 'Text a 6-digit login code to a mobile number',
      message: 'Code sent',
      limited: true,
      body: sendOtpSchema,
      response: sentCodeSchema,
      errors: [422, 429],
      handler: ({ body }, { auth }) => auth.sendOtp(body),
    }),
    route({
      method: 'post',
      path: '/otp/verify',
      summary: 'Sign in with the SMS code (creates the account on the first login)',
      message: 'Logged in successfully',
      limited: true,
      body: verifyOtpSchema,
      response: sessionSchema,
      errors: [400, 403, 422, 429],
      handler: async ({ body, client }, { auth }) => session(await auth.verifyOtp(body, client)),
    }),
{{/if}}
{{#if SOCIAL}}
    route({
      method: 'post',
      path: '/social',
      summary: 'Sign in with {{SOCIAL_PROVIDERS_TEXT}} (the token from the provider SDK is verified with the provider)',
      message: 'Logged in successfully',
      limited: true,
      body: socialLoginSchema,
      response: sessionSchema,
      errors: [401, 403, 422, 429],
      handler: async ({ body, client }, { auth }) => session(await auth.socialLogin(body, client)),
    }),
{{/if}}
{{#if AUTH_REFRESH}}
    route({
      method: 'post',
      path: '/refresh',
{{#if AUTH_ROTATION}}
      summary: 'New token pair for a refresh token (the used one is revoked; reusing it revokes the whole session)',
{{else}}
      summary: 'New access token for a refresh token',
{{/if}}
      message: 'Token refreshed',
      limited: true,
      body: refreshTokenSchema,
      response: sessionSchema,
      errors: [401, 422, 429],
      handler: async ({ body, client }, { auth }) => session(await auth.refresh(body.refreshToken, client)),
    }),
    route({
      method: 'post',
      path: '/logout',
      summary: 'End the session of a refresh token',
      message: 'Logged out',
      body: refreshTokenSchema,
      response: emptySchema,
      errors: [422],
      handler: async ({ body }, { auth }) => auth.logout(body.refreshToken),
    }),
    route({
      method: 'post',
      path: '/logout-all',
      summary: 'Log out on every device',
      message: 'Logged out on all devices',
      auth: true,
      response: emptySchema,
      errors: [401],
      handler: ({ user }, { auth }) => auth.logoutAll(user.id),
    }),
{{else}}
    route({
      method: 'post',
      path: '/logout',
      summary: 'Log out (invalidates every token of the user)',
      message: 'Logged out',
      auth: true,
      response: emptySchema,
      errors: [401],
      handler: ({ user }, { auth }) => auth.logout(user.id),
    }),
{{/if}}
    route({
      method: 'get',
      path: '/me',
      summary: 'The signed-in user',
      message: 'Current user',
      auth: true,
      response: publicUserSchema,
      errors: [401],
      handler: async ({ user }, { auth }) => publicUser(await auth.getCurrentUser(user.id)),
    }),
{{#if AUTH_EMAIL}}
    route({
      method: 'post',
      path: '/change-password',
      summary: 'Change (or set) the password – other sessions are signed out',
      message: 'Password changed',
      auth: true,
      limited: true,
      body: changePasswordSchema,
      response: sessionSchema,
      errors: [400, 401, 422, 429],
      handler: async ({ user, body, client }, { auth }) => session(await auth.changePassword(user.id, body, client)),
    }),
    route({
      method: 'post',
      path: '/forgot-password',
      summary: 'Email a 6-digit password reset code (always succeeds)',
      message: 'If the email is registered, a reset code has been sent',
      limited: true,
      body: forgotPasswordSchema,
      response: emptySchema,
      errors: [422, 429],
      handler: ({ body }, { auth }) => auth.requestPasswordReset(body.email),
    }),
    route({
      method: 'post',
      path: '/reset-password',
      summary: 'Set a new password with the emailed code',
      message: 'Password has been reset, please log in',
      limited: true,
      body: resetPasswordSchema,
      response: emptySchema,
      errors: [400, 422, 429],
      handler: ({ body }, { auth }) => auth.resetPassword(body),
    }),
    route({
      method: 'post',
      path: '/verify-email/request',
      summary: 'Email a verification code',
      message: 'Verification code sent',
      auth: true,
      limited: true,
      response: sentCodeSchema,
      errors: [400, 401, 409, 429],
      handler: ({ user }, { auth }) => auth.requestEmailVerification(user.id),
    }),
    route({
      method: 'post',
      path: '/verify-email',
      summary: 'Confirm the email address with the emailed code',
      message: 'Email verified',
      auth: true,
      limited: true,
      body: verifyEmailSchema,
      response: publicUserSchema,
      errors: [400, 401, 422, 429],
      handler: async ({ user, body }, { auth }) => publicUser(await auth.verifyEmail(user.id, body.code)),
    }),
{{/if}}
  ],
};
