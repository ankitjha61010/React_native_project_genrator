import { Router } from 'express';
import type { Services } from '{{IMPORT:app.container}}';
import { requireAuth } from '{{IMPORT:ex.mw.auth}}';
{{#if SEC_AUTH_RATE_LIMIT}}
import { authRateLimit } from '{{IMPORT:ex.mw.rateLimit}}';
{{/if}}
import { AuthController } from '{{IMPORT:ex.auth.controller}}';

/**
 * `/auth` – {{AUTH_METHODS_TEXT}}, sessions.
{{#if SEC_AUTH_RATE_LIMIT}}
 * `authRateLimit` = stricter limit (AUTH_RATE_LIMIT_*) on routes that take passwords or codes.
{{/if}}
 */
export function authRoutes(services: Services): Router {
  const router = Router();
  const auth = new AuthController(services.auth);
  const signedIn = requireAuth(services.sessions);

{{#if AUTH_EMAIL}}
  router.post('/register', {{#if SEC_AUTH_RATE_LIMIT}}authRateLimit, {{/if}}auth.register);
  router.post('/login', {{#if SEC_AUTH_RATE_LIMIT}}authRateLimit, {{/if}}auth.login);
{{/if}}
{{#if AUTH_OTP}}
  router.post('/otp/send', {{#if SEC_AUTH_RATE_LIMIT}}authRateLimit, {{/if}}auth.sendOtp);
  router.post('/otp/verify', {{#if SEC_AUTH_RATE_LIMIT}}authRateLimit, {{/if}}auth.verifyOtp);
{{/if}}
{{#if SOCIAL}}
  router.post('/social', {{#if SEC_AUTH_RATE_LIMIT}}authRateLimit, {{/if}}auth.socialLogin);
{{/if}}
{{#if AUTH_REFRESH}}
  router.post('/refresh', {{#if SEC_AUTH_RATE_LIMIT}}authRateLimit, {{/if}}auth.refresh);
  router.post('/logout', auth.logout);
  router.post('/logout-all', signedIn, auth.logoutAll);
{{else}}
  router.post('/logout', signedIn, auth.logout);
{{/if}}
  router.get('/me', signedIn, auth.me);
{{#if AUTH_EMAIL}}
  router.post('/change-password', {{#if SEC_AUTH_RATE_LIMIT}}authRateLimit, {{/if}}signedIn, auth.changePassword);
  router.post('/forgot-password', {{#if SEC_AUTH_RATE_LIMIT}}authRateLimit, {{/if}}auth.forgotPassword);
  router.post('/reset-password', {{#if SEC_AUTH_RATE_LIMIT}}authRateLimit, {{/if}}auth.resetPassword);
  router.post('/verify-email/request', {{#if SEC_AUTH_RATE_LIMIT}}authRateLimit, {{/if}}signedIn, auth.requestEmailVerification);
  router.post('/verify-email', {{#if SEC_AUTH_RATE_LIMIT}}authRateLimit, {{/if}}signedIn, auth.verifyEmail);
{{/if}}
  return router;
}
