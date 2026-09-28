import { Router, type RequestHandler } from 'express';
import type { AuthController } from '{{IMPORT:ex.auth.controller}}';
{{#if SEC_AUTH_RATE_LIMIT}}
import { authRateLimit } from '{{IMPORT:ex.mw.rateLimit}}';
{{/if}}

/** `/auth` – registration, sessions, password & email flows. */
export function createAuthRouter(controller: AuthController, authenticate: RequestHandler): Router {
  const router = Router();
{{#if SEC_AUTH_RATE_LIMIT}}
  // Brute-force protection on everything that takes credentials or sends email.
  const limited: RequestHandler[] = [authRateLimit];
{{else}}
  const limited: RequestHandler[] = [];
{{/if}}

  router.post('/register', ...limited, controller.register);
  router.post('/login', ...limited, controller.login);
{{#if AUTH_REFRESH}}
  router.post('/refresh', ...limited, controller.refresh);
  router.post('/logout', controller.logout);
  router.post('/logout-all', authenticate, controller.logoutAll);
{{else}}
  router.post('/logout', authenticate, controller.logout);
{{/if}}
  router.get('/me', authenticate, controller.me);
  router.post('/change-password', authenticate, ...limited, controller.changePassword);
  router.post('/forgot-password', ...limited, controller.forgotPassword);
  router.post('/reset-password', ...limited, controller.resetPassword);
  router.post('/verify-email', ...limited, controller.verifyEmail);
  router.post('/verify-email/request', authenticate, ...limited, controller.requestEmailVerification);
  return router;
}
