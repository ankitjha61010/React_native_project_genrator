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
const nest = ({ options }: BackendContext) => options.framework === 'nestjs';
const express = ({ options }: BackendContext) => options.framework === 'express';
const auth = ({ options }: BackendContext) => options.auth !== 'none';
const noAuth = (ctx: BackendContext) => !auth(ctx);
const refresh = ({ options }: BackendContext) => options.auth === 'access-refresh' || options.auth === 'refresh-rotation';
const prisma = ({ options }: BackendContext) => options.orm === 'prisma';
const typeorm = ({ options }: BackendContext) => options.orm === 'typeorm';
const mongoose = ({ options }: BackendContext) => options.orm === 'mongoose';
const swagger = ({ options }: BackendContext) => options.swagger;
const serviceStyle = ({ arch }: BackendContext) => arch.style === 'service';
const usecaseStyle = ({ arch }: BackendContext) => arch.style === 'usecase';
const views = ({ arch }: BackendContext) => arch.views;
const rateLimit = ({ options }: BackendContext) => options.security.rateLimit || (options.auth !== 'none' && options.security.authRateLimit);
const sanitize = ({ options }: BackendContext) => options.security.sanitize;
const all =
  (...conditions: Array<(ctx: BackendContext) => boolean>) =>
  (ctx: BackendContext) =>
    conditions.every(c => c(ctx));

const HASHER_FILES = { bcrypt: 'bcrypt-password-hasher.ts', argon2: 'argon2-password-hasher.ts', configurable: 'configurable-password-hasher.ts', none: '' };
const DB_CONNECTION_FILES = { prisma: 'prisma.client.ts', typeorm: 'data-source.ts', mongoose: 'mongoose.connection.ts' };

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

  // ── configuration & core kernel (framework independent) ───────────────────
  { id: 'config.env', template: 'shared/config/env.ts', layer: 'config', file: 'env.ts' },
  { id: 'core.logger', template: 'shared/core/logger.ts', layer: 'core', file: 'logger.ts' },
  { id: 'core.errors', template: 'shared/core/app-error.ts', layer: 'core', file: 'app-error.ts' },
  { id: 'core.response', template: 'shared/core/api-response.ts', layer: 'core', file: 'api-response.ts' },
  { id: 'core.pagination', template: 'shared/core/pagination.ts', layer: 'core', file: 'pagination.ts' },
  { id: 'core.crypto', template: 'shared/core/crypto.ts', layer: 'core', file: 'crypto.ts', when: auth },
  { id: 'core.sanitize', template: 'shared/core/sanitize.ts', layer: 'core', file: 'sanitize.ts', when: sanitize },

  // ── domain ────────────────────────────────────────────────────────────────
  { id: 'domain.user', template: 'shared/domain/user.entity.ts', layer: 'domain', feature: 'users', file: 'user.entity.ts' },
  { id: 'domain.roles', template: 'shared/domain/roles.ts', layer: 'domain', feature: 'users', file: 'roles.ts', when: auth },
  { id: 'domain.authTokens', template: 'shared/domain/auth-token.entity.ts', layer: 'domain', feature: 'auth', file: 'auth-token.entity.ts', when: auth },
  { id: 'contract.users', template: 'shared/domain/users.repository.ts', layer: 'repositoryContract', feature: 'users', file: 'users.repository.ts' },
  { id: 'contract.refreshTokens', template: 'shared/domain/refresh-tokens.repository.ts', layer: 'repositoryContract', feature: 'auth', file: 'refresh-tokens.repository.ts', when: refresh },
  { id: 'contract.userTokens', template: 'shared/domain/user-tokens.repository.ts', layer: 'repositoryContract', feature: 'auth', file: 'user-tokens.repository.ts', when: auth },

  // ── ports (interfaces of technical services) + implementations ─────────────
  { id: 'port.healthCheck', template: 'shared/ports/health-check.ts', layer: 'ports', file: 'health-check.ts' },
  { id: 'port.passwordHasher', template: 'shared/ports/password-hasher.ts', layer: 'ports', file: 'password-hasher.ts', when: auth },
  { id: 'port.tokenService', template: 'shared/ports/token-service.ts', layer: 'ports', file: 'token-service.ts', when: auth },
  { id: 'port.mailer', template: 'shared/ports/mailer.ts', layer: 'ports', file: 'mailer.ts', when: auth },
  { id: 'impl.passwordHasher', template: 'shared/security/password-hasher.impl.ts', layer: 'security', file: ({ options }) => HASHER_FILES[options.hashing], when: auth },
  { id: 'impl.tokenService', template: 'shared/security/jwt-token.service.ts', layer: 'security', file: 'jwt-token.service.ts', when: auth },
  { id: 'impl.mailer', template: 'shared/mail/log-mailer.ts', layer: 'mail', file: 'log-mailer.ts', when: auth },

  // ── database ──────────────────────────────────────────────────────────────
  { id: 'db.connection', template: 'shared/database/{orm}/connection.ts', layer: 'database', file: ({ options }) => DB_CONNECTION_FILES[options.orm] },
  { id: 'db.seed', template: 'shared/database/seed.ts', layer: 'database', file: 'seed.ts' },
  // Prisma
  { id: 'prisma.config', template: 'shared/database/prisma/prisma.config.ts', file: 'prisma.config.ts', when: prisma },
  { id: 'prisma.schema', template: 'shared/database/prisma/schema.prisma', file: 'prisma/schema.prisma', when: prisma },
  { id: 'prisma.migration', template: 'shared/database/prisma/migration.sql', file: 'prisma/migrations/20260101000000_init/migration.sql', when: prisma },
  { id: 'prisma.migrationLock', template: 'shared/database/prisma/migration_lock.toml', file: 'prisma/migrations/migration_lock.toml', when: prisma },
  // TypeORM
  { id: 'typeorm.user', template: 'shared/database/typeorm/user.orm-entity.ts', layer: 'database', file: 'entities/user.orm-entity.ts', when: typeorm },
  { id: 'typeorm.refreshToken', template: 'shared/database/typeorm/refresh-token.orm-entity.ts', layer: 'database', file: 'entities/refresh-token.orm-entity.ts', when: all(typeorm, refresh) },
  { id: 'typeorm.userToken', template: 'shared/database/typeorm/user-token.orm-entity.ts', layer: 'database', file: 'entities/user-token.orm-entity.ts', when: all(typeorm, auth) },
  { id: 'typeorm.migration', template: 'shared/database/typeorm/init.migration.ts', layer: 'database', file: 'migrations/1767225600000-Init.ts', when: typeorm },
  // Mongoose
  { id: 'mongoose.user', template: 'shared/database/mongoose/user.model.ts', layer: 'database', file: 'models/user.model.ts', when: mongoose },
  { id: 'mongoose.refreshToken', template: 'shared/database/mongoose/refresh-token.model.ts', layer: 'database', file: 'models/refresh-token.model.ts', when: all(mongoose, refresh) },
  { id: 'mongoose.userToken', template: 'shared/database/mongoose/user-token.model.ts', layer: 'database', file: 'models/user-token.model.ts', when: all(mongoose, auth) },
  // Repositories (the template picks the ORM implementation)
  { id: 'repo.users', template: 'shared/repositories/{orm}/users.repository.ts', layer: 'repositoryImpl', feature: 'users', file: ({ options }) => `${options.orm}-users.repository.ts` },
  { id: 'repo.refreshTokens', template: 'shared/repositories/{orm}/refresh-tokens.repository.ts', layer: 'repositoryImpl', feature: 'auth', file: ({ options }) => `${options.orm}-refresh-tokens.repository.ts`, when: refresh },
  { id: 'repo.userTokens', template: 'shared/repositories/{orm}/user-tokens.repository.ts', layer: 'repositoryImpl', feature: 'auth', file: ({ options }) => `${options.orm}-user-tokens.repository.ts`, when: auth },

  // ── application: services (service style) ─────────────────────────────────
  { id: 'app.authTypes', template: 'shared/application/auth.types.ts', layer: 'application', feature: 'auth', file: 'auth.types.ts', when: auth },
  { id: 'app.authService', template: 'shared/application/auth.service.ts', layer: 'application', feature: 'auth', file: 'auth.service.ts', when: all(auth, serviceStyle) },
  { id: 'app.usersService', template: 'shared/application/users.service.ts', layer: 'application', feature: 'users', file: 'users.service.ts', when: serviceStyle },
  { id: 'app.healthService', template: 'shared/application/health.service.ts', layer: 'application', feature: 'health', file: 'health.service.ts', when: serviceStyle },

  // ── application: use-cases (Clean / Enterprise) ────────────────────────────
  ...(
    [
      ['uc.support', 'auth-support.ts', auth],
      ['uc.authenticate', 'authenticate.use-case.ts', auth],
      ['uc.register', 'register.use-case.ts', auth],
      ['uc.login', 'login.use-case.ts', auth],
      ['uc.refreshSession', 'refresh-session.use-case.ts', refresh],
      ['uc.logout', 'logout.use-case.ts', auth],
      ['uc.logoutAll', 'logout-all.use-case.ts', refresh],
      ['uc.getCurrentUser', 'get-current-user.use-case.ts', auth],
      ['uc.changePassword', 'change-password.use-case.ts', auth],
      ['uc.requestPasswordReset', 'request-password-reset.use-case.ts', auth],
      ['uc.resetPassword', 'reset-password.use-case.ts', auth],
      ['uc.requestEmailVerification', 'request-email-verification.use-case.ts', auth],
      ['uc.verifyEmail', 'verify-email.use-case.ts', auth],
    ] as const
  ).map(([id, file, when]): BackendManifestEntry => ({
    id,
    template: `shared/application/use-cases/auth/${file}`,
    layer: 'application',
    feature: 'auth',
    file,
    when: all(usecaseStyle, when),
  })),
  ...(
    [
      ['uc.listUsers', 'list-users.use-case.ts', () => true],
      ['uc.getUser', 'get-user.use-case.ts', () => true],
      ['uc.createUser', 'create-user.use-case.ts', noAuth],
      ['uc.updateUser', 'update-user.use-case.ts', () => true],
      ['uc.updateProfile', 'update-profile.use-case.ts', auth],
      ['uc.deleteUser', 'delete-user.use-case.ts', () => true],
    ] as const
  ).map(([id, file, when]): BackendManifestEntry => ({
    id,
    template: `shared/application/use-cases/users/${file}`,
    layer: 'application',
    feature: 'users',
    file,
    when: all(usecaseStyle, when),
  })),
  { id: 'uc.checkHealth', template: 'shared/application/use-cases/health/check-health.use-case.ts', layer: 'application', feature: 'health', file: 'check-health.use-case.ts', when: usecaseStyle },

  // ── views (MVC presenters) ──────────────────────────────────────────────────
  { id: 'views.user', template: 'shared/views/user.view.ts', layer: 'views', feature: 'users', file: 'user.view.ts', when: views },
  { id: 'views.auth', template: 'shared/views/auth.view.ts', layer: 'views', feature: 'auth', file: 'auth.view.ts', when: all(views, auth) },

  // ── Express ───────────────────────────────────────────────────────────────
  { id: 'ex.server', template: 'express/bootstrap/server.ts', layer: 'bootstrap', file: 'server.ts', when: express },
  { id: 'ex.app', template: 'express/bootstrap/app.ts', layer: 'bootstrap', file: 'app.ts', when: express },
  { id: 'ex.container', template: 'express/bootstrap/container.ts', layer: 'bootstrap', file: 'container.ts', when: express },
  { id: 'ex.types', template: 'express/types/express.d.ts', file: 'src/types/express.d.ts', when: all(express, auth) },
  { id: 'ex.respond', template: 'express/http/respond.ts', layer: 'httpKernel', file: 'respond.ts', when: express },
  { id: 'ex.mw.validate', template: 'express/http/validate.middleware.ts', layer: 'httpKernel', file: 'validate.middleware.ts', when: express },
  { id: 'ex.mw.authenticate', template: 'express/http/authenticate.middleware.ts', layer: 'httpKernel', file: 'authenticate.middleware.ts', when: all(express, auth) },
  { id: 'ex.mw.authorize', template: 'express/http/authorize.middleware.ts', layer: 'httpKernel', file: 'authorize.middleware.ts', when: all(express, auth) },
  { id: 'ex.mw.errorHandler', template: 'express/http/error-handler.middleware.ts', layer: 'httpKernel', file: 'error-handler.middleware.ts', when: express },
  { id: 'ex.mw.notFound', template: 'express/http/not-found.middleware.ts', layer: 'httpKernel', file: 'not-found.middleware.ts', when: express },
  { id: 'ex.mw.requestLogger', template: 'express/http/request-logger.middleware.ts', layer: 'httpKernel', file: 'request-logger.middleware.ts', when: express },
  { id: 'ex.mw.security', template: 'express/http/security.middleware.ts', layer: 'httpKernel', file: 'security.middleware.ts', when: express },
  { id: 'ex.mw.rateLimit', template: 'express/http/rate-limit.middleware.ts', layer: 'httpKernel', file: 'rate-limit.middleware.ts', when: all(express, rateLimit) },
  { id: 'ex.mw.sanitize', template: 'express/http/sanitize.middleware.ts', layer: 'httpKernel', file: 'sanitize.middleware.ts', when: all(express, sanitize) },
  { id: 'ex.docs.helpers', template: 'express/docs/openapi.helpers.ts', layer: 'docs', file: 'openapi.helpers.ts', when: all(express, swagger) },
  { id: 'ex.docs.openapi', template: 'express/docs/openapi.ts', layer: 'docs', file: 'openapi.ts', when: all(express, swagger) },
  { id: 'ex.docs.router', template: 'express/docs/docs.router.ts', layer: 'docs', file: 'docs.router.ts', when: all(express, swagger) },
  // features
  { id: 'ex.health.controller', template: 'express/features/health.controller.ts', layer: 'http', feature: 'health', file: 'health.controller.ts', when: express },
  { id: 'ex.health.routes', template: 'express/features/health.routes.ts', layer: 'routes', feature: 'health', file: 'health.routes.ts', when: express },
  { id: 'ex.auth.controller', template: 'express/features/auth.controller.ts', layer: 'http', feature: 'auth', file: 'auth.controller.ts', when: all(express, auth) },
  { id: 'ex.auth.routes', template: 'express/features/auth.routes.ts', layer: 'routes', feature: 'auth', file: 'auth.routes.ts', when: all(express, auth) },
  { id: 'ex.auth.schemas', template: 'express/features/auth.schemas.ts', layer: 'dto', feature: 'auth', file: 'auth.schemas.ts', when: all(express, auth) },
  { id: 'ex.auth.docs', template: 'express/features/auth.docs.ts', layer: 'dto', feature: 'auth', file: 'auth.docs.ts', when: all(express, auth, swagger) },
  { id: 'ex.users.controller', template: 'express/features/users.controller.ts', layer: 'http', feature: 'users', file: 'users.controller.ts', when: express },
  { id: 'ex.users.routes', template: 'express/features/users.routes.ts', layer: 'routes', feature: 'users', file: 'users.routes.ts', when: express },
  { id: 'ex.users.schemas', template: 'express/features/users.schemas.ts', layer: 'dto', feature: 'users', file: 'users.schemas.ts', when: express },
  { id: 'ex.users.docs', template: 'express/features/users.docs.ts', layer: 'dto', feature: 'users', file: 'users.docs.ts', when: all(express, swagger) },
  { id: 'ex.health.docs', template: 'express/features/health.docs.ts', layer: 'dto', feature: 'health', file: 'health.docs.ts', when: all(express, swagger) },
  // Modular: every module exposes a factory (its public API).
  ...(['auth', 'users', 'health'] as const).map(
    (feature): BackendManifestEntry => ({
      id: `ex.module.${feature}`,
      template: `express/modules/${feature}.module.ts`,
      layer: 'module',
      feature,
      file: 'index.ts',
      when: ctx => express(ctx) && ctx.arch.id === 'modular' && (feature !== 'auth' || auth(ctx)),
    }),
  ),

  // ── NestJS ────────────────────────────────────────────────────────────────
  { id: 'nest.main', template: 'nestjs/bootstrap/main.ts', layer: 'bootstrap', file: 'main.ts', when: nest },
  // Everything main.ts configures on the app – shared with the e2e tests.
  { id: 'nest.setup', template: 'nestjs/bootstrap/app.setup.ts', layer: 'bootstrap', file: 'app.setup.ts', when: nest },
  { id: 'nest.appModule', template: 'nestjs/bootstrap/app.module.ts', layer: 'bootstrap', file: 'app.module.ts', when: nest },
  { id: 'nest.configModule', template: 'nestjs/config/config.module.ts', layer: 'config', file: 'config.module.ts', when: nest },
  { id: 'nest.tokens', template: 'nestjs/core/injection-tokens.ts', layer: 'core', file: 'injection-tokens.ts', when: nest },
  { id: 'nest.logger', template: 'nestjs/core/app-logger.service.ts', layer: 'core', file: 'app-logger.service.ts', when: nest },
  { id: 'nest.databaseModule', template: 'nestjs/database/database.module.ts', layer: 'database', file: 'database.module.ts', when: nest },
  { id: 'nest.securityModule', template: 'nestjs/security/security.module.ts', layer: 'security', file: 'security.module.ts', when: all(nest, auth) },
  { id: 'nest.filter', template: 'nestjs/http/all-exceptions.filter.ts', layer: 'httpKernel', file: 'all-exceptions.filter.ts', when: nest },
  { id: 'nest.interceptor', template: 'nestjs/http/response.interceptor.ts', layer: 'httpKernel', file: 'response.interceptor.ts', when: nest },
  { id: 'nest.validationPipe', template: 'nestjs/http/validation.pipe.ts', layer: 'httpKernel', file: 'validation.pipe.ts', when: nest },
  { id: 'nest.decorators', template: 'nestjs/http/http.decorators.ts', layer: 'httpKernel', file: 'http.decorators.ts', when: nest },
  { id: 'nest.authGuard', template: 'nestjs/http/jwt-auth.guard.ts', layer: 'httpKernel', file: 'jwt-auth.guard.ts', when: all(nest, auth) },
  { id: 'nest.accessGuard', template: 'nestjs/http/access.guard.ts', layer: 'httpKernel', file: 'access.guard.ts', when: all(nest, auth) },
  { id: 'nest.sanitize', template: 'nestjs/http/sanitize.middleware.ts', layer: 'httpKernel', file: 'sanitize.middleware.ts', when: all(nest, sanitize) },
  { id: 'nest.requestLogger', template: 'nestjs/http/request-logger.middleware.ts', layer: 'httpKernel', file: 'request-logger.middleware.ts', when: nest },
  { id: 'nest.swagger', template: 'nestjs/docs/swagger.ts', layer: 'docs', file: 'swagger.ts', when: all(nest, swagger) },
  { id: 'nest.apiResponses', template: 'nestjs/docs/api-responses.ts', layer: 'docs', file: 'api-responses.ts', when: all(nest, swagger) },
  ...(['auth', 'users', 'health'] as const).flatMap((feature): BackendManifestEntry[] => {
    const enabled = (ctx: BackendContext) => nest(ctx) && (feature !== 'auth' || auth(ctx));
    return [
      { id: `nest.${feature}.controller`, template: `nestjs/features/${feature}.controller.ts`, layer: 'http', feature, file: `${feature}.controller.ts`, when: enabled },
      { id: `nest.${feature}.providers`, template: `nestjs/features/${feature}.providers.ts`, layer: 'module', feature, file: `${feature}.providers.ts`, when: enabled },
      { id: `nest.${feature}.module`, template: `nestjs/features/${feature}.module.ts`, layer: 'module', feature, file: `${feature}.module.ts`, when: ctx => enabled(ctx) && ctx.arch.featureModules },
      ...(feature === 'health'
        ? []
        : [{ id: `nest.${feature}.dto`, template: `nestjs/features/${feature}.dto.ts`, layer: 'dto' as const, feature, file: `${feature}.dto.ts`, when: enabled }]),
    ];
  }),

  // ── tests ─────────────────────────────────────────────────────────────────
  { id: 'test.env', template: 'shared/test/test-env.ts', file: 'test/support/test-env.ts' },
  { id: 'test.harness', template: 'shared/test/harness.ts', file: 'test/support/harness.ts' },
  { id: 'test.inMemory', template: 'shared/test/in-memory-repositories.ts', file: 'test/support/in-memory-repositories.ts' },
  { id: 'test.fakes', template: 'shared/test/fakes.ts', file: 'test/support/fakes.ts' },
  { id: 'test.app', template: 'shared/test/test-app.ts', file: 'test/support/test-app.ts' },
  { id: 'test.unit.auth', template: 'shared/test/auth.spec.ts', file: 'test/unit/auth.spec.ts', when: auth },
  { id: 'test.unit.hasher', template: 'shared/test/password-hasher.spec.ts', file: 'test/unit/password-hasher.spec.ts', when: auth },
  { id: 'test.unit.users', template: 'shared/test/users.spec.ts', file: 'test/unit/users.spec.ts' },
  { id: 'test.e2e.health', template: 'shared/test/health.e2e-spec.ts', file: 'test/e2e/health.e2e-spec.ts' },
  { id: 'test.e2e.auth', template: 'shared/test/auth.e2e-spec.ts', file: 'test/e2e/auth.e2e-spec.ts', when: auth },
  { id: 'test.e2e.users', template: 'shared/test/users.e2e-spec.ts', file: 'test/e2e/users.e2e-spec.ts' },
];
