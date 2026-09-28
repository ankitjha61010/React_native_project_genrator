import express, { type Express } from 'express';
import { config } from '{{IMPORT:config.env}}';
{{#if SWAGGER}}
import { createDocsRouter } from '{{IMPORT:ex.docs.router}}';
{{/if}}
import type { Services } from '{{IMPORT:app.container}}';
{{#if API_ENCRYPTION}}
import { apiEncryption } from '{{IMPORT:http.encryption}}';
{{/if}}
import { errorHandler } from '{{IMPORT:ex.mw.errorHandler}}';
import { notFoundHandler } from '{{IMPORT:ex.mw.notFound}}';
{{#if SEC_RATE_LIMIT}}
import { globalRateLimit } from '{{IMPORT:ex.mw.rateLimit}}';
{{/if}}
import { requestLogger } from '{{IMPORT:ex.mw.requestLogger}}';
import { applySecurity } from '{{IMPORT:ex.mw.security}}';
import { mountRoutes } from '{{IMPORT:ex.route}}';
import { routeGroups } from '{{IMPORT:ex.routes}}';

/** Builds the Express app (no `listen` – used by server.ts and the tests). */
export function createApp(services: Services): Express {
  const app = express();

  app.use(requestLogger);
  applySecurity(app);
{{#if SEC_RATE_LIMIT}}
  app.use(globalRateLimit);
{{/if}}
{{#if UPLOADS}}
  // Uploaded files (avatars, chat media). Never executed, never listed.
  app.use(config.uploads.publicPath, express.static(config.uploads.dir, { index: false, dotfiles: 'deny', maxAge: '7d' }));
{{/if}}

  // Every route lives under /<API_PREFIX>/<API_VERSION>, e.g. /api/v1/auth/login.
  const api = express.Router();
{{#if API_ENCRYPTION}}
  api.use(apiEncryption);
{{/if}}
  mountRoutes(api, routeGroups, services);
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
