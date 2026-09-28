import type { BackendArchitecture, BackendFeature, BackendLayer } from './architectures.js';
import type { BackendOptions } from './types.js';

export interface BackendContext {
  options: BackendOptions;
  arch: BackendArchitecture;
}

/**
 * One file of the generated backend. `layer` + `feature` decide the folder (through the
 * architecture); files without a layer are written at their `file` path (project root).
 */
export interface BackendManifestEntry {
  /** Stable id used by `{{IMPORT:id}}`. */
  id: string;
  /** Template path relative to `templates/backend/`. */
  template: string;
  layer?: BackendLayer;
  feature?: BackendFeature;
  /** File name inside the layer folder (or the root-relative path when there is no layer). */
  file: string | ((ctx: BackendContext) => string);
  when?: (ctx: BackendContext) => boolean;
  /** Extra template flags for this file only. */
  flags?: Record<string, boolean>;
}

// ── conditions ────────────────────────────────────────────────────────────────
type Condition = (ctx: BackendContext) => boolean;
const nest: Condition = ({ options }) => options.framework === 'nestjs';
const express: Condition = ({ options }) => options.framework === 'express';
const auth: Condition = ({ options }) => options.auth !== 'none';
const refresh: Condition = ({ options }) => options.auth === 'access-refresh' || options.auth === 'refresh-rotation';
const email: Condition = ctx => auth(ctx) && ctx.options.authMethods.email;
const otp: Condition = ctx => auth(ctx) && ctx.options.authMethods.mobileOtp;
const social: Condition = ctx => auth(ctx) && (ctx.options.authMethods.google || ctx.options.authMethods.facebook || ctx.options.authMethods.apple);
const codes: Condition = ctx => email(ctx) || otp(ctx);
const chat: Condition = ctx => auth(ctx) && ctx.options.modules.chat;
const notifications: Condition = ctx => auth(ctx) && ctx.options.modules.notifications;
const realtime: Condition = ctx => chat(ctx) || notifications(ctx);
const encryption: Condition = ({ options }) => options.apiEncryption;
const prisma: Condition = ({ options }) => options.orm === 'prisma';
const typeorm: Condition = ({ options }) => options.orm === 'typeorm';
const mongoose: Condition = ({ options }) => options.orm === 'mongoose';
const swagger: Condition = ({ options }) => options.swagger;
const views: Condition = ({ arch }) => arch.views;
const rateLimit: Condition = ({ options }) => options.security.rateLimit || (options.auth !== 'none' && options.security.authRateLimit);
const sanitize: Condition = ({ options }) => options.security.sanitize;
// Microservices: which service this is (undefined = the monolith).
const replica: Condition = ({ options }) => options.service === 'chat' || options.service === 'notifications';
const identity: Condition = ({ options }) => options.service === 'identity';
const events: Condition = ({ options }) => options.service !== undefined;
const authApi: Condition = ctx => auth(ctx) && !replica(ctx);
const usersApi: Condition = ctx => !replica(ctx);
/** Chat pushes to offline members – directly, or through the notifications service. */
const chatPush: Condition = ctx => notifications(ctx) || (chat(ctx) && replica(ctx) && Boolean(ctx.options.remotePush));
/** Avatars (identity) and chat media – the notifications service stores no files. */
const uploads: Condition = ctx => auth(ctx) && ctx.options.service !== 'notifications';
const socketServer: Condition = ctx => realtime(ctx) && ctx.options.service !== 'notifications';
const all =
  (...conditions: Condition[]): Condition =>
  ctx =>
    conditions.every(c => c(ctx));

const HASHER_FILES = { bcrypt: 'bcrypt-password-hasher.ts', argon2: 'argon2-password-hasher.ts', configurable: 'configurable-password-hasher.ts', none: '' };
const DB_CONNECTION_FILES = { prisma: 'prisma.client.ts', typeorm: 'data-source.ts', mongoose: 'mongoose.connection.ts' };

/** Features with an HTTP API, and when they exist. */
const FEATURES: Array<[BackendFeature, Condition]> = [
  ['health', () => true],
  ['auth', authApi],
  ['users', usersApi],
  ['chat', chat],
  ['notifications', notifications],
];

export const BACKEND_MANIFEST: BackendManifestEntry[] = [
  // ── project root ────────────────────────────────────────────────────────────
  { id: 'root.gitignore', template: 'root/gitignore', file: '.gitignore' },
  { id: 'root.envExample', template: 'root/env', file: '.env.example', flags: { ENV_EXAMPLE: true } },
  // Local values with freshly generated secrets (git-ignored).
  { id: 'root.env', template: 'root/env', file: '.env' },
  { id: 'root.tsconfig', template: 'root/tsconfig.json', file: 'tsconfig.json' },
  { id: 'root.tsconfigBuild', template: 'root/tsconfig.build.json', file: 'tsconfig.build.json' },
  { id: 'root.nestCli', template: 'root/nest-cli.json', file: 'nest-cli.json', when: nest },
  { id: 'root.vitest', template: 'root/vitest.config.ts', file: 'vitest.config.ts' },
  { id: 'root.vitestE2e', template: 'root/vitest.config.e2e.ts', file: 'vitest.config.e2e.ts' },
  { id: 'root.oxlint', template: 'root/oxlintrc.json', file: '.oxlintrc.json' },
  { id: 'root.prettier', template: 'root/prettierrc', file: '.prettierrc' },
  { id: 'root.prettierignore', template: 'root/prettierignore', file: '.prettierignore' },
  { id: 'root.readme', template: 'root/README.md', file: 'README.md' },
  { id: 'root.architectureDoc', template: 'root/ARCHITECTURE.md', file: 'docs/ARCHITECTURE.md' },
  { id: 'root.apiDoc', template: 'root/API.md', file: 'docs/API.md' },

  // ── configuration & core kernel (framework independent) ───────────────────
  { id: 'config.env', template: 'shared/config/env.ts', layer: 'config', file: 'env.ts' },
  { id: 'core.logger', template: 'shared/core/logger.ts', layer: 'core', file: 'logger.ts' },
  { id: 'core.errors', template: 'shared/core/app-error.ts', layer: 'core', file: 'app-error.ts' },
  { id: 'core.response', template: 'shared/core/api-response.ts', layer: 'core', file: 'api-response.ts' },
  { id: 'core.pagination', template: 'shared/core/pagination.ts', layer: 'core', file: 'pagination.ts' },
  { id: 'core.crypto', template: 'shared/core/crypto.ts', layer: 'core', file: 'crypto.ts', when: auth },
  { id: 'core.sanitize', template: 'shared/core/sanitize.ts', layer: 'core', file: 'sanitize.ts', when: sanitize },

  // ── domain: entities + repository contracts ──────────────────────────────
  { id: 'domain.user', template: 'shared/domain/user.entity.ts', layer: 'domain', feature: 'users', file: 'user.entity.ts' },
  { id: 'domain.roles', template: 'shared/domain/roles.ts', layer: 'domain', feature: 'users', file: 'roles.ts', when: auth },
  { id: 'domain.authTokens', template: 'shared/domain/auth-token.entity.ts', layer: 'domain', feature: 'auth', file: 'auth-token.entity.ts', when: ctx => refresh(ctx) || codes(ctx) || social(ctx) },
  { id: 'domain.chat', template: 'shared/domain/chat.entity.ts', layer: 'domain', feature: 'chat', file: 'chat.entity.ts', when: chat },
  { id: 'domain.notification', template: 'shared/domain/notification.entity.ts', layer: 'domain', feature: 'notifications', file: 'notification.entity.ts', when: notifications },
  { id: 'contract.users', template: 'shared/domain/users.repository.ts', layer: 'repositoryContract', feature: 'users', file: 'users.repository.ts' },
  { id: 'contract.auth', template: 'shared/domain/auth.repository.ts', layer: 'repositoryContract', feature: 'auth', file: 'auth.repository.ts', when: ctx => refresh(ctx) || codes(ctx) || social(ctx) },
  { id: 'contract.chat', template: 'shared/domain/chat.repository.ts', layer: 'repositoryContract', feature: 'chat', file: 'chat.repository.ts', when: chat },
  { id: 'contract.notifications', template: 'shared/domain/notifications.repository.ts', layer: 'repositoryContract', feature: 'notifications', file: 'notifications.repository.ts', when: notifications },

  // ── ports (interfaces of technical services) + implementations ─────────────
  { id: 'port.healthCheck', template: 'shared/ports/health-check.ts', layer: 'ports', file: 'health-check.ts' },
  { id: 'port.passwordHasher', template: 'shared/ports/password-hasher.ts', layer: 'ports', file: 'password-hasher.ts', when: email },
  { id: 'port.tokenService', template: 'shared/ports/token-service.ts', layer: 'ports', file: 'token-service.ts', when: auth },
  { id: 'port.mailer', template: 'shared/ports/mailer.ts', layer: 'ports', file: 'mailer.ts', when: email },
  { id: 'port.smsSender', template: 'shared/ports/sms-sender.ts', layer: 'ports', file: 'sms-sender.ts', when: otp },
  { id: 'port.socialVerifier', template: 'shared/ports/social-verifier.ts', layer: 'ports', file: 'social-verifier.ts', when: social },
  { id: 'port.fileStorage', template: 'shared/ports/file-storage.ts', layer: 'ports', file: 'file-storage.ts', when: uploads },
  { id: 'port.pushSender', template: 'shared/ports/push-sender.ts', layer: 'ports', file: 'push-sender.ts', when: chatPush },
  { id: 'port.realtime', template: 'shared/ports/realtime.ts', layer: 'ports', file: 'realtime.ts', when: realtime },
  { id: 'impl.passwordHasher', template: 'shared/security/password-hasher.impl.ts', layer: 'security', file: ({ options }) => HASHER_FILES[options.hashing], when: email },
  { id: 'impl.tokenService', template: 'shared/security/jwt-token.service.ts', layer: 'security', file: 'jwt-token.service.ts', when: auth },
  { id: 'impl.socialVerifier', template: 'shared/security/social-verifier.ts', layer: 'security', file: 'social-verifier.ts', when: social },
  { id: 'impl.mailer', template: 'shared/adapters/mailer.ts', layer: 'adapters', file: 'mailer.ts', when: email },
  { id: 'impl.smsSender', template: 'shared/adapters/sms-sender.ts', layer: 'adapters', file: 'sms-sender.ts', when: otp },
  { id: 'impl.pushSender', template: 'shared/adapters/push-sender.ts', layer: 'adapters', file: 'push-sender.ts', when: notifications },
  { id: 'impl.fileStorage', template: 'shared/adapters/local-file-storage.ts', layer: 'adapters', file: 'local-file-storage.ts', when: uploads },
  { id: 'realtime.server', template: 'shared/realtime/socket.server.ts', layer: 'realtime', file: 'socket.server.ts', when: socketServer },
  // Microservices: events between the services (Redis).
  { id: 'port.eventBus', template: 'shared/ports/event-bus.ts', layer: 'ports', file: 'event-bus.ts', when: events },
  { id: 'impl.eventBus', template: 'shared/adapters/event-bus.ts', layer: 'adapters', file: 'event-bus.ts', when: events },
  { id: 'events.realtime', template: 'shared/events/realtime.ts', layer: 'adapters', file: 'event-realtime.ts', when: ({ options }) => options.service === 'notifications' },
  { id: 'events.usersPublisher', template: 'shared/events/users-publisher.ts', layer: 'adapters', file: 'publishing-users.repository.ts', when: identity },
  { id: 'events.handlers', template: 'shared/events/handlers.ts', layer: 'bootstrap', file: 'event-handlers.ts', when: replica },
  { id: 'http.encryption', template: 'shared/http/encryption.middleware.ts', layer: 'httpKernel', file: 'encryption.middleware.ts', when: encryption },

  // ── database ──────────────────────────────────────────────────────────────
  { id: 'db.connection', template: 'shared/database/{orm}/connection.ts', layer: 'database', file: ({ options }) => DB_CONNECTION_FILES[options.orm] },
  { id: 'db.repositories', template: 'shared/repositories/{orm}/index.ts', layer: 'database', file: 'repositories.ts' },
  // Replica services get their users from the identity service – nothing to seed.
  { id: 'db.seed', template: 'shared/database/seed.ts', layer: 'database', file: 'seed.ts', when: usersApi },
  // Prisma
  { id: 'prisma.config', template: 'shared/database/prisma/prisma.config.ts', file: 'prisma.config.ts', when: prisma },
  { id: 'prisma.schema', template: 'shared/database/prisma/schema.prisma', file: 'prisma/schema.prisma', when: prisma },
  { id: 'prisma.migration', template: 'shared/database/prisma/migration.sql', file: 'prisma/migrations/20260101000000_init/migration.sql', when: prisma },
  { id: 'prisma.migrationLock', template: 'shared/database/prisma/migration_lock.toml', file: 'prisma/migrations/migration_lock.toml', when: prisma },
  // TypeORM
  { id: 'typeorm.columns', template: 'shared/database/typeorm/columns.ts', layer: 'database', file: 'entities/columns.ts', when: typeorm },
  { id: 'typeorm.user', template: 'shared/database/typeorm/user.orm-entity.ts', layer: 'database', file: 'entities/user.orm-entity.ts', when: typeorm },
  { id: 'typeorm.auth', template: 'shared/database/typeorm/auth.orm-entities.ts', layer: 'database', file: 'entities/auth.orm-entities.ts', when: ctx => typeorm(ctx) && (refresh(ctx) || codes(ctx) || social(ctx)) },
  { id: 'typeorm.chat', template: 'shared/database/typeorm/chat.orm-entities.ts', layer: 'database', file: 'entities/chat.orm-entities.ts', when: all(typeorm, chat) },
  { id: 'typeorm.notifications', template: 'shared/database/typeorm/notification.orm-entities.ts', layer: 'database', file: 'entities/notification.orm-entities.ts', when: all(typeorm, notifications) },
  { id: 'typeorm.migration', template: 'shared/database/typeorm/init.migration.ts', layer: 'database', file: 'migrations/1767225600000-Init.ts', when: typeorm },
  // Mongoose
  { id: 'mongoose.user', template: 'shared/database/mongoose/user.model.ts', layer: 'database', file: 'models/user.model.ts', when: mongoose },
  { id: 'mongoose.auth', template: 'shared/database/mongoose/auth.models.ts', layer: 'database', file: 'models/auth.models.ts', when: ctx => mongoose(ctx) && (refresh(ctx) || codes(ctx) || social(ctx)) },
  { id: 'mongoose.chat', template: 'shared/database/mongoose/chat.models.ts', layer: 'database', file: 'models/chat.models.ts', when: all(mongoose, chat) },
  { id: 'mongoose.notifications', template: 'shared/database/mongoose/notification.models.ts', layer: 'database', file: 'models/notification.models.ts', when: all(mongoose, notifications) },
  // Repositories (one file per feature; the template picks the ORM implementation)
  { id: 'repo.users', template: 'shared/repositories/{orm}/users.repository.ts', layer: 'repositoryImpl', feature: 'users', file: ({ options }) => `${options.orm}-users.repository.ts` },
  { id: 'repo.auth', template: 'shared/repositories/{orm}/auth.repository.ts', layer: 'repositoryImpl', feature: 'auth', file: ({ options }) => `${options.orm}-auth.repository.ts`, when: ctx => refresh(ctx) || codes(ctx) || social(ctx) },
  { id: 'repo.chat', template: 'shared/repositories/{orm}/chat.repository.ts', layer: 'repositoryImpl', feature: 'chat', file: ({ options }) => `${options.orm}-chat.repository.ts`, when: chat },
  { id: 'repo.notifications', template: 'shared/repositories/{orm}/notifications.repository.ts', layer: 'repositoryImpl', feature: 'notifications', file: ({ options }) => `${options.orm}-notifications.repository.ts`, when: notifications },

  // ── application: one service per feature + the composition root ───────────
  { id: 'app.authTypes', template: 'shared/application/auth.types.ts', layer: 'application', feature: 'auth', file: 'auth.types.ts', when: auth },
  { id: 'app.authSessions', template: 'shared/application/auth.sessions.ts', layer: 'application', feature: 'auth', file: 'auth.sessions.ts', when: auth },
  { id: 'app.authCodes', template: 'shared/application/auth.codes.ts', layer: 'application', feature: 'auth', file: 'auth.codes.ts', when: codes },
  { id: 'app.authService', template: 'shared/application/auth.service.ts', layer: 'application', feature: 'auth', file: 'auth.service.ts', when: authApi },
  { id: 'app.usersService', template: 'shared/application/users.service.ts', layer: 'application', feature: 'users', file: 'users.service.ts', when: usersApi },
  { id: 'app.healthService', template: 'shared/application/health.service.ts', layer: 'application', feature: 'health', file: 'health.service.ts' },
  { id: 'app.chatService', template: 'shared/application/chat.service.ts', layer: 'application', feature: 'chat', file: 'chat.service.ts', when: chat },
  { id: 'app.notificationsService', template: 'shared/application/notifications.service.ts', layer: 'application', feature: 'notifications', file: 'notifications.service.ts', when: notifications },
  { id: 'app.container', template: 'shared/bootstrap/container.ts', layer: 'bootstrap', file: 'container.ts' },

  // ── views (MVC presenters) ──────────────────────────────────────────────────
  { id: 'views.user', template: 'shared/views/user.view.ts', layer: 'views', feature: 'users', file: 'user.view.ts', when: all(views, usersApi) },
  { id: 'views.auth', template: 'shared/views/auth.view.ts', layer: 'views', feature: 'auth', file: 'auth.view.ts', when: all(views, authApi) },

  // ── Express ───────────────────────────────────────────────────────────────
  { id: 'ex.server', template: 'express/bootstrap/server.ts', layer: 'bootstrap', file: 'server.ts', when: express },
  { id: 'ex.app', template: 'express/bootstrap/app.ts', layer: 'bootstrap', file: 'app.ts', when: express },
  { id: 'ex.routes', template: 'express/bootstrap/routes.ts', layer: 'bootstrap', file: 'routes.ts', when: express },
  { id: 'ex.route', template: 'express/http/route.ts', layer: 'httpKernel', file: 'route.ts', when: express },
  { id: 'ex.schemas', template: 'express/http/common.schemas.ts', layer: 'httpKernel', file: 'common.schemas.ts', when: express },
  { id: 'ex.respond', template: 'express/http/respond.ts', layer: 'httpKernel', file: 'respond.ts', when: express },
  { id: 'ex.mw.errorHandler', template: 'express/http/error-handler.middleware.ts', layer: 'httpKernel', file: 'error-handler.middleware.ts', when: express },
  { id: 'ex.mw.notFound', template: 'express/http/not-found.middleware.ts', layer: 'httpKernel', file: 'not-found.middleware.ts', when: express },
  { id: 'ex.mw.requestLogger', template: 'express/http/request-logger.middleware.ts', layer: 'httpKernel', file: 'request-logger.middleware.ts', when: express },
  { id: 'ex.mw.security', template: 'express/http/security.middleware.ts', layer: 'httpKernel', file: 'security.middleware.ts', when: express },
  { id: 'ex.mw.rateLimit', template: 'express/http/rate-limit.middleware.ts', layer: 'httpKernel', file: 'rate-limit.middleware.ts', when: all(express, rateLimit) },
  { id: 'ex.mw.sanitize', template: 'express/http/sanitize.middleware.ts', layer: 'httpKernel', file: 'sanitize.middleware.ts', when: all(express, sanitize) },
  { id: 'ex.docs.helpers', template: 'express/docs/openapi.helpers.ts', layer: 'docs', file: 'openapi.helpers.ts', when: all(express, swagger) },
  { id: 'ex.docs.openapi', template: 'express/docs/openapi.ts', layer: 'docs', file: 'openapi.ts', when: all(express, swagger) },
  { id: 'ex.docs.router', template: 'express/docs/docs.router.ts', layer: 'docs', file: 'docs.router.ts', when: all(express, swagger) },
  // One route table per feature (+ its request / response schemas).
  ...FEATURES.flatMap(([feature, enabled]): BackendManifestEntry[] => [
    { id: `ex.${feature}.controller`, template: `express/features/${feature}.controller.ts`, layer: 'http', feature, file: `${feature}.controller.ts`, when: all(express, enabled) },
    ...(feature === 'health'
      ? []
      : [{ id: `ex.${feature}.schemas`, template: `express/features/${feature}.schemas.ts`, layer: 'dto' as const, feature, file: `${feature}.schemas.ts`, when: all(express, enabled) }]),
  ]),

  // ── NestJS ────────────────────────────────────────────────────────────────
  { id: 'nest.main', template: 'nestjs/bootstrap/main.ts', layer: 'bootstrap', file: 'main.ts', when: nest },
  // Everything main.ts configures on the app – shared with the e2e tests.
  { id: 'nest.setup', template: 'nestjs/bootstrap/app.setup.ts', layer: 'bootstrap', file: 'app.setup.ts', when: nest },
  { id: 'nest.appModule', template: 'nestjs/bootstrap/app.module.ts', layer: 'bootstrap', file: 'app.module.ts', when: nest },
  { id: 'nest.coreModule', template: 'nestjs/bootstrap/core.module.ts', layer: 'bootstrap', file: 'core.module.ts', when: nest },
  { id: 'nest.tokens', template: 'nestjs/core/injection-tokens.ts', layer: 'core', file: 'injection-tokens.ts', when: nest },
  { id: 'nest.logger', template: 'nestjs/core/app-logger.service.ts', layer: 'core', file: 'app-logger.service.ts', when: nest },
  { id: 'nest.filter', template: 'nestjs/http/all-exceptions.filter.ts', layer: 'httpKernel', file: 'all-exceptions.filter.ts', when: nest },
  { id: 'nest.interceptor', template: 'nestjs/http/response.interceptor.ts', layer: 'httpKernel', file: 'response.interceptor.ts', when: nest },
  { id: 'nest.validationPipe', template: 'nestjs/http/validation.pipe.ts', layer: 'httpKernel', file: 'validation.pipe.ts', when: nest },
  { id: 'nest.decorators', template: 'nestjs/http/http.decorators.ts', layer: 'httpKernel', file: 'http.decorators.ts', when: nest },
  { id: 'nest.authGuard', template: 'nestjs/http/jwt-auth.guard.ts', layer: 'httpKernel', file: 'jwt-auth.guard.ts', when: all(nest, auth) },
  { id: 'nest.accessGuard', template: 'nestjs/http/access.guard.ts', layer: 'httpKernel', file: 'access.guard.ts', when: all(nest, auth) },
  { id: 'nest.sanitize', template: 'nestjs/http/sanitize.middleware.ts', layer: 'httpKernel', file: 'sanitize.middleware.ts', when: all(nest, sanitize) },
  { id: 'nest.requestLogger', template: 'nestjs/http/request-logger.middleware.ts', layer: 'httpKernel', file: 'request-logger.middleware.ts', when: nest },
  { id: 'nest.upload', template: 'nestjs/http/upload.ts', layer: 'httpKernel', file: 'upload.ts', when: all(nest, uploads) },
  { id: 'nest.swagger', template: 'nestjs/docs/swagger.ts', layer: 'docs', file: 'swagger.ts', when: all(nest, swagger) },
  { id: 'nest.endpoint', template: 'nestjs/http/endpoint.ts', layer: 'httpKernel', file: 'endpoint.ts', when: nest },
  { id: 'nest.commonDto', template: 'nestjs/http/common.dto.ts', layer: 'httpKernel', file: 'common.dto.ts', when: nest },
  ...FEATURES.flatMap(([feature, enabled]): BackendManifestEntry[] => {
    const on = all(nest, enabled);
    return [
      { id: `nest.${feature}.controller`, template: `nestjs/features/${feature}.controller.ts`, layer: 'http', feature, file: `${feature}.controller.ts`, when: on },
      { id: `nest.${feature}.module`, template: 'nestjs/features/feature.module.ts', layer: 'module', feature, file: `${feature}.module.ts`, when: ctx => on(ctx) && ctx.arch.featureModules, flags: { [`MODULE_${feature.toUpperCase()}`]: true } },
      ...(feature === 'health'
        ? []
        : [{ id: `nest.${feature}.dto`, template: `nestjs/features/${feature}.dto.ts`, layer: 'dto' as const, feature, file: `${feature}.dto.ts`, when: on }]),
    ];
  }),

  // ── tests ─────────────────────────────────────────────────────────────────
  { id: 'test.env', template: 'shared/test/test-env.ts', file: 'test/support/test-env.ts' },
  { id: 'test.inMemory', template: 'shared/test/in-memory-repositories.ts', file: 'test/support/in-memory-repositories.ts' },
  { id: 'test.fakes', template: 'shared/test/fakes.ts', file: 'test/support/fakes.ts' },
  { id: 'test.infra', template: 'shared/test/test-infrastructure.ts', file: 'test/support/test-infrastructure.ts' },
  { id: 'test.app', template: 'shared/test/test-app.ts', file: 'test/support/test-app.ts' },
  { id: 'test.unit.auth', template: 'shared/test/auth.spec.ts', file: 'test/unit/auth.spec.ts', when: authApi },
  { id: 'test.unit.hasher', template: 'shared/test/password-hasher.spec.ts', file: 'test/unit/password-hasher.spec.ts', when: email },
  { id: 'test.unit.users', template: 'shared/test/users.spec.ts', file: 'test/unit/users.spec.ts', when: usersApi },
  { id: 'test.unit.events', template: 'shared/test/events.spec.ts', file: 'test/unit/events.spec.ts', when: ctx => identity(ctx) || replica(ctx) },
  { id: 'test.unit.chat', template: 'shared/test/chat.spec.ts', file: 'test/unit/chat.spec.ts', when: chat },
  { id: 'test.unit.notifications', template: 'shared/test/notifications.spec.ts', file: 'test/unit/notifications.spec.ts', when: notifications },
  { id: 'test.unit.encryption', template: 'shared/test/encryption.spec.ts', file: 'test/unit/encryption.spec.ts', when: encryption },
  { id: 'test.e2e.health', template: 'shared/test/health.e2e-spec.ts', file: 'test/e2e/health.e2e-spec.ts' },
  { id: 'test.e2e.auth', template: 'shared/test/auth.e2e-spec.ts', file: 'test/e2e/auth.e2e-spec.ts', when: authApi },
  { id: 'test.e2e.users', template: 'shared/test/users.e2e-spec.ts', file: 'test/e2e/users.e2e-spec.ts', when: usersApi },
  { id: 'test.e2e.chat', template: 'shared/test/chat.e2e-spec.ts', file: 'test/e2e/chat.e2e-spec.ts', when: chat },
  { id: 'test.e2e.notifications', template: 'shared/test/notifications.e2e-spec.ts', file: 'test/e2e/notifications.e2e-spec.ts', when: notifications },
];
