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
import { apiRoutes } from '{{IMPORT:ex.routes}}';

/**
 * Builds the Express app: middleware (logging, security{{#if SEC_RATE_LIMIT}}, rate limit{{/if}}), the API routes, then the
 * 404 and error handlers. No `listen` here – server.ts starts it, the tests use it directly.
 */
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
{{#if LEGAL}}
  // Legal pages the app opens: /terms-and-conditions, /privacy-policy… (public/*.html – edit them).
  app.use(express.static('public', { index: false, extensions: ['html'], dotfiles: 'deny', maxAge: '1h' }));
{{/if}}

  // Every route lives under /<API_PREFIX>/<API_VERSION>, e.g. /api/v1/auth/login (see routes.ts).
{{#if API_ENCRYPTION}}
  app.use(config.api.basePath, apiEncryption, apiRoutes(services));
{{else}}
  app.use(config.api.basePath, apiRoutes(services));
{{/if}}
{{#if SWAGGER}}

  if (config.swagger.enabled) {
    app.use(`/${config.api.prefix}/${config.swagger.path}`, createDocsRouter());
  }
{{/if}}

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
