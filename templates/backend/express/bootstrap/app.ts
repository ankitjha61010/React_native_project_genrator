import express, { type Express } from 'express';
import { config } from '{{IMPORT:config.env}}';
{{#if SWAGGER}}
import { createDocsRouter } from '{{IMPORT:ex.docs.router}}';
{{/if}}
{{#if !MODULE_FACTORIES}}
{{#if AUTH}}
import { AuthController } from '{{IMPORT:ex.auth.controller}}';
import { createAuthRouter } from '{{IMPORT:ex.auth.routes}}';
import { createAuthenticate } from '{{IMPORT:ex.mw.authenticate}}';
{{/if}}
import { HealthController } from '{{IMPORT:ex.health.controller}}';
import { createHealthRouter } from '{{IMPORT:ex.health.routes}}';
import { UsersController } from '{{IMPORT:ex.users.controller}}';
import { createUsersRouter } from '{{IMPORT:ex.users.routes}}';
{{/if}}
import { errorHandler } from '{{IMPORT:ex.mw.errorHandler}}';
import { notFoundHandler } from '{{IMPORT:ex.mw.notFound}}';
{{#if SEC_RATE_LIMIT}}
import { globalRateLimit } from '{{IMPORT:ex.mw.rateLimit}}';
{{/if}}
import { requestLogger } from '{{IMPORT:ex.mw.requestLogger}}';
import { applySecurity } from '{{IMPORT:ex.mw.security}}';
import type { Container } from '{{IMPORT:ex.container}}';

/** Builds the Express app (no `listen` – used by server.ts and the tests). */
export function createApp(container: Container): Express {
  const app = express();

  app.use(requestLogger);
  applySecurity(app);
{{#if SEC_RATE_LIMIT}}
  app.use(globalRateLimit);
{{/if}}

  // Every route lives under /<API_PREFIX>/<API_VERSION>, e.g. /api/v1/auth/login.
  const api = express.Router();
{{#if MODULE_FACTORIES}}
  api.use('/health', container.health.router);
{{#if AUTH}}
  api.use('/auth', container.auth.router);
{{/if}}
  api.use('/users', container.users.router);
{{else}}
{{#if AUTH}}
  const authenticate = createAuthenticate(token => container.auth.authenticate{{CALL}}(token));
{{/if}}
  api.use('/health', createHealthRouter(new HealthController(container.health)));
{{#if AUTH}}
  api.use('/auth', createAuthRouter(new AuthController(container.auth), authenticate));
  api.use('/users', createUsersRouter(new UsersController(container.users), authenticate));
{{else}}
  api.use('/users', createUsersRouter(new UsersController(container.users)));
{{/if}}
{{/if}}
  app.use(config.api.basePath, api);
{{#if SWAGGER}}

  if (config.swagger.enabled) {
    app.use(`/${config.api.prefix}/${config.swagger.path}`, createDocsRouter());
  }
{{/if}}

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
