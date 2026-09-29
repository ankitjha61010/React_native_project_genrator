import { VersioningType } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
{{#if SEC_HELMET}}
import helmet from 'helmet';
{{/if}}
import { config } from '{{IMPORT:config.env}}';
import { errorResponse } from '{{IMPORT:core.response}}';
{{#if SOCKET_SERVER}}
import { logger } from '{{IMPORT:core.logger}}';
import type { Infrastructure, Services } from '{{IMPORT:app.container}}';
import { attachSocketServer, SocketHub } from '{{IMPORT:realtime.server}}';
import { INFRASTRUCTURE, SERVICES } from '{{IMPORT:nest.tokens}}';
{{/if}}
{{#if API_ENCRYPTION}}
import { apiEncryption } from '{{IMPORT:http.encryption}}';
{{/if}}
{{#if SWAGGER}}
import { setupSwagger } from '{{IMPORT:nest.swagger}}';
{{/if}}
import { AllExceptionsFilter } from '{{IMPORT:nest.filter}}';
import { requestLogger } from '{{IMPORT:nest.requestLogger}}';
import { ResponseInterceptor } from '{{IMPORT:nest.interceptor}}';
{{#if SEC_SANITIZE}}
import { sanitizeInput } from '{{IMPORT:nest.sanitize}}';
{{/if}}
import { AppValidationPipe } from '{{IMPORT:nest.validationPipe}}';
import { COMMON_MESSAGES } from '{{IMPORT:core.messages}}';

/** Body parser errors happen before Nest's router – answer them with the standard envelope. */
function bodyParserErrors(error: { type?: string }, _req: Request, res: Response, next: NextFunction): void {
  if (error?.type === 'entity.too.large') {
    res.status(413).json(errorResponse(COMMON_MESSAGES.payloadTooLarge));
  } else if (error?.type === 'entity.parse.failed') {
    res.status(400).json(errorResponse(COMMON_MESSAGES.malformedJson));
  } else {
    next(error);
  }
}

/**
 * Everything applied to the app before it listens – shared by main.ts and the e2e tests
 * so both run exactly the same HTTP pipeline.
 */
export function configureApp(app: NestExpressApplication): void {
  app.disable('x-powered-by');
  if (config.http.trustProxy) app.set('trust proxy', 1);
  app.use(requestLogger);
{{#if SEC_HELMET}}
  app.use(helmet());
{{/if}}
{{#if SEC_CORS}}

  const allowed = new Set(config.http.corsOrigins);
  app.enableCors({
    // Requests without an Origin (mobile apps, server to server) are allowed.
    origin: (origin, callback) => callback(null, !origin || allowed.has(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
    maxAge: 600,
  });
{{/if}}

{{#if SEC_BODY_LIMIT}}
  app.useBodyParser('json', { limit: config.http.bodyLimit });
  app.useBodyParser('urlencoded', { extended: false, limit: config.http.bodyLimit });
{{else}}
  app.useBodyParser('json');
  app.useBodyParser('urlencoded', { extended: false });
{{/if}}
  app.use(bodyParserErrors);
{{#if SEC_SANITIZE}}
  app.use(sanitizeInput);
{{/if}}
{{#if API_ENCRYPTION}}
  // API routes only (not the docs / uploads).
  app.use(config.api.basePath, apiEncryption);
{{/if}}
{{#if UPLOADS}}
  // Uploaded files (avatars{{#if CHAT}}, chat media{{/if}}). Never executed, never listed.
  app.useStaticAssets(config.uploads.dir, { prefix: config.uploads.publicPath, index: false, dotfiles: 'deny', maxAge: '7d' });
{{/if}}
{{#if LEGAL}}
  // Legal pages the app opens: /terms-and-conditions, /privacy-policy… (public/*.html – edit them).
  app.useStaticAssets('public', { index: false, extensions: ['html'], dotfiles: 'deny', maxAge: '1h' });
{{/if}}

  // /<API_PREFIX>/v<N>/… e.g. /api/v1/auth/login
  app.setGlobalPrefix(config.api.prefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: config.api.version.slice(1) });

  app.useGlobalPipes(new AppValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
{{#if SWAGGER}}

  if (config.swagger.enabled) setupSwagger(app);
{{/if}}
{{#if SOCKET_SERVER}}

  // Socket.IO on the same port (the app connects to the API origin).
  const infra = app.get<Infrastructure>(INFRASTRUCTURE);
  const services = app.get<Services>(SERVICES);
  if (infra.realtime instanceof SocketHub) {
    attachSocketServer(app.getHttpServer(), infra.realtime, {
      authenticate: token => services.sessions.authenticate(token),
      users: infra.repositories.users,
{{#if CHAT}}
      isMember: (userId, conversationId) => services.chat.isMember(userId, conversationId),
      markRead: (userId, conversationId) => services.chat.markRead(userId, conversationId),
{{/if}}
      logger,
    });
  }
{{/if}}
}
