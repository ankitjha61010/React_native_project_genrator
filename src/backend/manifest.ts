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
  /**
   * Feature-Based / Layered / MVC / Modular: an interface lives in the same file as its only
   * implementation. This file's code goes to the top of the first of these files that exists
   * (Clean / Enterprise keep it in its own file and layer).
   */
  mergeInto?: string[];
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
const docker: Condition = ({ options }) => options.docker;
const redis: Condition = ({ options }) => options.redis || options.service !== undefined;
/** Codes live in Redis (with a TTL) instead of a database table. */
const redisCodes: Condition = ctx => codes(ctx) && redis(ctx) && !(ctx.options.service === 'chat' || ctx.options.service === 'notifications');
const dbCodes: Condition = ctx => codes(ctx) && !redisCodes(ctx);
/** Database tables / repositories of the auth feature. */
const authTables: Condition = ctx => refresh(ctx) || dbCodes(ctx) || social(ctx);
const chat: Condition = ctx => auth(ctx) && ctx.options.modules.chat;
const notifications: Condition = ctx => auth(ctx) && ctx.options.modules.notifications;
/** Agora calling module (audio or video, or both). */
const calling: Condition = ctx => auth(ctx) && (ctx.options.modules.audioCall || ctx.options.modules.videoCall);
/** The users' devices (FCM tokens) – part of push notifications. */
const devices: Condition = notifications;
/** iOS VoIP (PushKit) pushes for incoming calls – sent to the devices' VoIP tokens (so calling + devices). */
const voipPush: Condition = ctx => calling(ctx) && devices(ctx);
/** Sign-in payloads carry the app's device: stored here, or published to the notifications service (identity). */
const deviceInput: Condition = ctx => (devices(ctx) && ctx.options.service === undefined) || (ctx.options.service === 'identity' && Boolean(ctx.options.remoteDevices));
/** GET /legal + the Terms & Conditions / Privacy Policy pages (monolith / identity service). */
const legal: Condition = ctx => ctx.options.modules.legal && !replica(ctx);
/** DELETE /users/me – the user deletes their own account. */
const deleteAccount: Condition = ctx => auth(ctx) && ctx.options.modules.deleteAccount && !replica(ctx);
/** Over-The-Air updates: public update checks, admin-only releases (monolith / identity service). */
const ota: Condition = ctx => auth(ctx) && Boolean(ctx.options.modules.ota) && !replica(ctx);
/** Payments (monolith / identity service): in-app purchases and / or a payment gateway. */
const iapProvider = (ctx: BackendContext) => (auth(ctx) && !replica(ctx) ? (ctx.options.modules.inAppPurchase ?? 'none') : 'none');
const gatewayProvider = (ctx: BackendContext) => (auth(ctx) && !replica(ctx) ? (ctx.options.modules.paymentGateway ?? 'none') : 'none');
const iap: Condition = ctx => iapProvider(ctx) !== 'none';
const gateway: Condition = ctx => gatewayProvider(ctx) !== 'none';
const payments: Condition = ctx => iap(ctx) || gateway(ctx);
const realtime: Condition = ctx => chat(ctx) || notifications(ctx) || calling(ctx);
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
/** Browser page at /tester to try chat / calls without the app (only what is generated: chat, calls or both). */
const tester: Condition = ctx => socketServer(ctx) && (chat(ctx) || calling(ctx));
const all =
  (...conditions: Condition[]): Condition =>
  ctx =>
    conditions.every(c => c(ctx));

/** Clean / Enterprise: every interface in its own file and layer. */
const strict = ({ arch }: BackendContext) => arch.id === 'clean' || arch.id === 'enterprise';
/** ORM repository file: `users.repository.ts` (next to nothing else) or `prisma-users.repository.ts` (next to its interface). */
const repoFile =
  (feature: string) =>
  (ctx: BackendContext): string =>
    strict(ctx) ? `${ctx.options.orm}-${feature}.repository.ts` : `${feature}.repository.ts`;

const HASHER_FILES = { bcrypt: 'bcrypt-password-hasher.ts', argon2: 'argon2-password-hasher.ts', configurable: 'configurable-password-hasher.ts', none: '' };
const DB_CONNECTION_FILES = { prisma: 'prisma.client.ts', typeorm: 'data-source.ts', mongoose: 'mongoose.connection.ts' };

/** Features with an HTTP API, and when they exist. */
const FEATURES: Array<[BackendFeature, Condition]> = [
  ['health', () => true],
  ['auth', authApi],
  ['users', usersApi],
  ['chat', chat],
  ['devices', devices],
  ['notifications', notifications],
  ['calling', calling],
  ['legal', legal],
  ['ota', ota],
  ['payments', payments],
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
  // Docker (optional): image of the API + a compose file for the database / Redis.
  { id: 'root.dockerfile', template: 'root/Dockerfile', file: 'Dockerfile', when: docker },
  { id: 'root.dockerignore', template: 'root/dockerignore', file: '.dockerignore', when: docker },
  // Microservices: one docker-compose.yml at the workspace root instead.
  { id: 'root.compose', template: 'root/docker-compose.yml', file: 'docker-compose.yml', when: ctx => docker(ctx) && !ctx.options.service },
  { id: 'root.readme', template: 'root/README.md', file: 'README.md' },
  { id: 'root.architectureDoc', template: 'root/ARCHITECTURE.md', file: 'docs/ARCHITECTURE.md' },
  { id: 'root.apiDoc', template: 'root/API.md', file: 'docs/API.md' },
  // Legal pages the app opens (edit them, or point TERMS_URL / PRIVACY_POLICY_URL / DELETE_ACCOUNT_URL at your own).
  { id: 'root.terms', template: 'root/public/terms-and-conditions.html', file: 'public/terms-and-conditions.html', when: legal },
  { id: 'root.privacy', template: 'root/public/privacy-policy.html', file: 'public/privacy-policy.html', when: legal },
  { id: 'root.deleteAccountPage', template: 'root/public/delete-account.html', file: 'public/delete-account.html', when: ctx => legal(ctx) && deleteAccount(ctx) },

  // ── configuration & core kernel (framework independent) ───────────────────
  { id: 'config.env', template: 'shared/config/env.ts', layer: 'config', file: 'env.ts' },
  { id: 'core.logger', template: 'shared/core/logger.ts', layer: 'core', file: 'logger.ts' },
  { id: 'core.errors', template: 'shared/core/app-error.ts', layer: 'core', file: 'app-error.ts' },
  { id: 'core.response', template: 'shared/core/api-response.ts', layer: 'core', file: 'api-response.ts' },
  { id: 'core.pagination', template: 'shared/core/pagination.ts', layer: 'core', file: 'pagination.ts' },
  { id: 'core.crypto', template: 'shared/core/crypto.ts', layer: 'core', file: 'crypto.ts', when: auth },
  // Response / error messages: the shared ones + one file per feature (change the wording there).
  { id: 'core.messages', template: 'shared/core/messages.ts', layer: 'core', file: 'messages.ts' },
  { id: 'core.sanitize', template: 'shared/core/sanitize.ts', layer: 'core', file: 'sanitize.ts', when: sanitize },

  // Users / auth messages are also used by the repositories and token checks of every service.
  ...FEATURES.map(([feature, enabled]): BackendManifestEntry => ({
    id: `messages.${feature}`,
    template: `shared/messages/${feature}.messages.ts`,
    layer: 'messages',
    feature,
    file: `${feature}.messages.ts`,
    when: feature === 'users' ? () => true : feature === 'auth' ? auth : enabled,
  })),

  // ── domain: entities + repository contracts ──────────────────────────────
  { id: 'domain.user', template: 'shared/domain/user.entity.ts', layer: 'domain', feature: 'users', file: 'user.entity.ts' },
  { id: 'domain.roles', template: 'shared/domain/roles.ts', layer: 'domain', feature: 'users', file: 'roles.ts', when: auth },
  { id: 'domain.authTokens', template: 'shared/domain/auth-token.entity.ts', layer: 'domain', feature: 'auth', file: 'auth-token.entity.ts', when: ctx => refresh(ctx) || codes(ctx) || social(ctx) },
  { id: 'domain.chat', template: 'shared/domain/chat.entity.ts', layer: 'domain', feature: 'chat', file: 'chat.entity.ts', when: chat },
  { id: 'domain.device', template: 'shared/domain/device.entity.ts', layer: 'domain', feature: 'devices', file: 'device.entity.ts', when: ctx => devices(ctx) || deviceInput(ctx) },
  { id: 'domain.notification', template: 'shared/domain/notification.entity.ts', layer: 'domain', feature: 'notifications', file: 'notification.entity.ts', when: notifications },
  { id: 'contract.users', template: 'shared/domain/users.repository.ts', layer: 'repositoryContract', feature: 'users', file: 'users.repository.ts', mergeInto: ['repo.users'] },
  { id: 'contract.auth', template: 'shared/domain/auth.repository.ts', layer: 'repositoryContract', feature: 'auth', file: 'auth.repository.ts', when: ctx => refresh(ctx) || codes(ctx) || social(ctx), mergeInto: ['repo.auth', 'repo.redisCodes'] },
  { id: 'contract.chat', template: 'shared/domain/chat.repository.ts', layer: 'repositoryContract', feature: 'chat', file: 'chat.repository.ts', when: chat, mergeInto: ['repo.chat'] },
  { id: 'contract.devices', template: 'shared/domain/devices.repository.ts', layer: 'repositoryContract', feature: 'devices', file: 'devices.repository.ts', when: devices, mergeInto: ['repo.devices'] },
  { id: 'contract.notifications', template: 'shared/domain/notifications.repository.ts', layer: 'repositoryContract', feature: 'notifications', file: 'notifications.repository.ts', when: notifications, mergeInto: ['repo.notifications'] },

  // ── ports (interfaces of technical services) + implementations ─────────────
  { id: 'port.healthCheck', template: 'shared/ports/health-check.ts', layer: 'ports', file: 'health-check.ts', mergeInto: ['app.healthService'] },
  { id: 'port.passwordHasher', template: 'shared/ports/password-hasher.ts', layer: 'ports', file: 'password-hasher.ts', when: email, mergeInto: ['impl.passwordHasher'] },
  { id: 'port.tokenService', template: 'shared/ports/token-service.ts', layer: 'ports', file: 'token-service.ts', when: auth, mergeInto: ['impl.tokenService'] },
  { id: 'port.mailer', template: 'shared/ports/mailer.ts', layer: 'ports', file: 'mailer.ts', when: email, mergeInto: ['impl.mailer'] },
  { id: 'port.smsSender', template: 'shared/ports/sms-sender.ts', layer: 'ports', file: 'sms-sender.ts', when: otp, mergeInto: ['impl.smsSender'] },
  { id: 'port.socialVerifier', template: 'shared/ports/social-verifier.ts', layer: 'ports', file: 'social-verifier.ts', when: social, mergeInto: ['impl.socialVerifier'] },
  { id: 'port.fileStorage', template: 'shared/ports/file-storage.ts', layer: 'ports', file: 'file-storage.ts', when: uploads, mergeInto: ['impl.fileStorage'] },
  { id: 'port.pushSender', template: 'shared/ports/push-sender.ts', layer: 'ports', file: 'push-sender.ts', when: chatPush, mergeInto: ['impl.pushSender'] },
  { id: 'port.voipPushSender', template: 'shared/ports/voip-push-sender.ts', layer: 'ports', file: 'voip-push-sender.ts', when: voipPush, mergeInto: ['impl.voipPushSender'] },
  { id: 'port.realtime', template: 'shared/ports/realtime.ts', layer: 'ports', file: 'realtime.ts', when: realtime, mergeInto: ['realtime.server', 'events.realtime'] },
  { id: 'impl.passwordHasher', template: 'shared/security/password-hasher.impl.ts', layer: 'security', file: ({ options }) => HASHER_FILES[options.hashing ?? (options as any).passwordHashing ?? 'bcrypt'], when: email },
  { id: 'impl.tokenService', template: 'shared/security/jwt-token.service.ts', layer: 'security', file: 'jwt-token.service.ts', when: auth },
  { id: 'impl.socialVerifier', template: 'shared/security/social-verifier.ts', layer: 'security', file: 'social-verifier.ts', when: social },
  { id: 'impl.mailer', template: 'shared/adapters/mailer.ts', layer: 'adapters', file: 'mailer.ts', when: email },
  { id: 'impl.smsSender', template: 'shared/adapters/sms-sender.ts', layer: 'adapters', file: 'sms-sender.ts', when: otp },
  { id: 'impl.pushSender', template: 'shared/adapters/push-sender.ts', layer: 'adapters', file: 'push-sender.ts', when: notifications },
  { id: 'impl.voipPushSender', template: 'shared/adapters/voip-push-sender.ts', layer: 'adapters', file: 'voip-push-sender.ts', when: voipPush },
  { id: 'impl.fileStorage', template: 'shared/adapters/local-file-storage.ts', layer: 'adapters', file: 'local-file-storage.ts', when: uploads },
  { id: 'realtime.server', template: 'shared/realtime/socket.server.ts', layer: 'realtime', file: 'socket.server.ts', when: socketServer },
  // Chat / call tester: tester/*.html|js|css served at /tester (development only) by tester.page.ts.
  { id: 'realtime.tester', template: 'shared/realtime/tester.page.ts', layer: 'realtime', file: 'tester.page.ts', when: tester },
  { id: 'root.testerHtml', template: 'root/tester/index.html', file: 'tester/index.html', when: tester },
  { id: 'root.testerJs', template: 'root/tester/tester.js', file: 'tester/tester.js', when: tester },
  { id: 'root.testerCss', template: 'root/tester/tester.css', file: 'tester/tester.css', when: tester },
  // Microservices: events between the services (Redis).
  { id: 'port.eventBus', template: 'shared/ports/event-bus.ts', layer: 'ports', file: 'event-bus.ts', when: events, mergeInto: ['impl.eventBus'] },
  { id: 'impl.eventBus', template: 'shared/adapters/event-bus.ts', layer: 'adapters', file: 'event-bus.ts', when: events },
  { id: 'events.realtime', template: 'shared/events/realtime.ts', layer: 'adapters', file: 'event-realtime.ts', when: ({ options }) => options.service === 'notifications' },
  { id: 'events.usersPublisher', template: 'shared/events/users-publisher.ts', layer: 'adapters', file: 'publishing-users.repository.ts', when: identity },
  { id: 'events.handlers', template: 'shared/events/handlers.ts', layer: 'bootstrap', file: 'event-handlers.ts', when: replica },
  { id: 'http.encryption', template: 'shared/http/encryption.middleware.ts', layer: 'httpKernel', file: 'encryption.middleware.ts', when: encryption },

  // ── database ──────────────────────────────────────────────────────────────
  { id: 'db.connection', template: 'shared/database/{orm}/connection.ts', layer: 'database', file: ({ options }) => DB_CONNECTION_FILES[options.orm] },
  { id: 'db.repositories', template: 'shared/repositories/{orm}/index.ts', layer: 'database', file: 'repositories.ts' },
  // Redis (optional in a monolith, always on in microservices): one shared connection + a cache helper.
  { id: 'db.redis', template: 'shared/database/redis.ts', layer: 'database', file: 'redis.ts', when: redis },
  { id: 'db.cache', template: 'shared/database/cache.ts', layer: 'database', file: 'cache.ts', when: redis },
  // Replica services get their users from the identity service – nothing to seed.
  { id: 'db.seed', template: 'shared/database/seed.ts', layer: 'database', file: 'seed.ts', when: usersApi },
  // Prisma
  { id: 'prisma.config', template: 'shared/database/prisma/prisma.config.ts', file: 'prisma.config.ts', when: prisma },
  { id: 'prisma.schema', template: 'shared/database/prisma/schema.prisma', file: 'prisma/schema.prisma', when: prisma },
  { id: 'prisma.migration', template: 'shared/database/prisma/migration.sql', file: 'prisma/migrations/20260101000000_init/migration.sql', when: prisma },
  { id: 'prisma.migrationLock', template: 'shared/database/prisma/migration_lock.toml', file: 'prisma/migrations/migration_lock.toml', when: prisma },
  // TypeORM
  { id: 'typeorm.columns', template: 'shared/database/typeorm/columns.ts', layer: 'database', file: 'typeorm-columns.ts', when: typeorm },
  { id: 'typeorm.user', template: 'shared/database/typeorm/user.orm-entity.ts', layer: 'model', feature: 'users', file: 'user.orm-entity.ts', when: typeorm },
  { id: 'typeorm.auth', template: 'shared/database/typeorm/auth.orm-entities.ts', layer: 'model', feature: 'auth', file: 'auth.orm-entities.ts', when: ctx => typeorm(ctx) && authTables(ctx) },
  { id: 'typeorm.chat', template: 'shared/database/typeorm/chat.orm-entities.ts', layer: 'model', feature: 'chat', file: 'chat.orm-entities.ts', when: all(typeorm, chat) },
  { id: 'typeorm.device', template: 'shared/database/typeorm/device.orm-entity.ts', layer: 'model', feature: 'devices', file: 'device.orm-entity.ts', when: all(typeorm, devices) },
  { id: 'typeorm.notifications', template: 'shared/database/typeorm/notification.orm-entities.ts', layer: 'model', feature: 'notifications', file: 'notification.orm-entities.ts', when: all(typeorm, notifications) },
  { id: 'typeorm.migration', template: 'shared/database/typeorm/init.migration.ts', layer: 'database', file: 'migrations/1767225600000-Init.ts', when: typeorm },
  // Mongoose
  { id: 'mongoose.user', template: 'shared/database/mongoose/user.model.ts', layer: 'model', feature: 'users', file: 'user.model.ts', when: mongoose },
  { id: 'mongoose.auth', template: 'shared/database/mongoose/auth.models.ts', layer: 'model', feature: 'auth', file: 'auth.models.ts', when: ctx => mongoose(ctx) && authTables(ctx) },
  { id: 'mongoose.chat', template: 'shared/database/mongoose/chat.models.ts', layer: 'model', feature: 'chat', file: 'chat.models.ts', when: all(mongoose, chat) },
  { id: 'mongoose.device', template: 'shared/database/mongoose/device.model.ts', layer: 'model', feature: 'devices', file: 'device.model.ts', when: all(mongoose, devices) },
  { id: 'mongoose.notifications', template: 'shared/database/mongoose/notification.models.ts', layer: 'model', feature: 'notifications', file: 'notification.models.ts', when: all(mongoose, notifications) },
  // Repositories (one file per feature; the template picks the ORM implementation)
  { id: 'repo.users', template: 'shared/repositories/{orm}/users.repository.ts', layer: 'repositoryImpl', feature: 'users', file: repoFile('users') },
  { id: 'repo.auth', template: 'shared/repositories/{orm}/auth.repository.ts', layer: 'repositoryImpl', feature: 'auth', file: repoFile('auth'), when: authTables },
  { id: 'repo.chat', template: 'shared/repositories/{orm}/chat.repository.ts', layer: 'repositoryImpl', feature: 'chat', file: repoFile('chat'), when: chat },
  { id: 'repo.redisCodes', template: 'shared/repositories/redis-codes.repository.ts', layer: 'repositoryImpl', feature: 'auth', file: 'redis-verification-codes.repository.ts', when: redisCodes },
  { id: 'repo.devices', template: 'shared/repositories/{orm}/devices.repository.ts', layer: 'repositoryImpl', feature: 'devices', file: repoFile('devices'), when: devices },
  { id: 'repo.notifications', template: 'shared/repositories/{orm}/notifications.repository.ts', layer: 'repositoryImpl', feature: 'notifications', file: repoFile('notifications'), when: notifications },

  // ── application: one service per feature + the composition root ───────────
  { id: 'app.authTypes', template: 'shared/application/auth.types.ts', layer: 'application', feature: 'auth', file: 'auth.types.ts', when: auth },
  { id: 'app.authSessions', template: 'shared/application/auth.sessions.ts', layer: 'application', feature: 'auth', file: 'auth.sessions.ts', when: auth },
  { id: 'app.authCodes', template: 'shared/application/auth.codes.ts', layer: 'application', feature: 'auth', file: 'auth.codes.ts', when: codes },
  { id: 'app.authService', template: 'shared/application/auth.service.ts', layer: 'application', feature: 'auth', file: 'auth.service.ts', when: authApi },
  { id: 'app.usersService', template: 'shared/application/users.service.ts', layer: 'application', feature: 'users', file: 'users.service.ts', when: usersApi },
  { id: 'app.healthService', template: 'shared/application/health.service.ts', layer: 'application', feature: 'health', file: 'health.service.ts' },
  { id: 'app.chatUtils', template: 'shared/application/chat.utils.ts', layer: 'application', feature: 'chat', file: 'chat.utils.ts', when: chat },
  { id: 'app.chatService', template: 'shared/application/chat.service.ts', layer: 'application', feature: 'chat', file: 'chat.service.ts', when: chat },
  { id: 'app.devicesService', template: 'shared/application/devices.service.ts', layer: 'application', feature: 'devices', file: 'devices.service.ts', when: devices },
  { id: 'app.notificationsService', template: 'shared/application/notifications.service.ts', layer: 'application', feature: 'notifications', file: 'notifications.service.ts', when: notifications },
  // ── Calling (Agora token generation, call lifecycle, signaling, history) ──
  { id: 'domain.call', template: 'shared/domain/call.entity.ts', layer: 'domain', feature: 'calling', file: 'call.entity.ts', when: calling },
  { id: 'contract.calling', template: 'shared/domain/calling.repository.ts', layer: 'repositoryContract', feature: 'calling', file: 'calling.repository.ts', when: calling, mergeInto: ['repo.calling'] },
  { id: 'repo.calling', template: 'shared/repositories/{orm}/calling.repository.ts', layer: 'repositoryImpl', feature: 'calling', file: repoFile('calling'), when: calling },
  // Prisma schema / migration entries for calling
  { id: 'prisma.calling', template: 'shared/database/prisma/calling.schema.prisma', file: 'prisma/calling.prisma', when: all(prisma, calling) },
  { id: 'typeorm.calling', template: 'shared/database/typeorm/call.orm-entities.ts', layer: 'model', feature: 'calling', file: 'call.orm-entities.ts', when: all(typeorm, calling) },
  { id: 'mongoose.calling', template: 'shared/database/mongoose/call.models.ts', layer: 'model', feature: 'calling', file: 'call.models.ts', when: all(mongoose, calling) },
  { id: 'app.callingService', template: 'shared/application/calling.service.ts', layer: 'application', feature: 'calling', file: 'calling.service.ts', when: calling },
  // Legal links + pages edited in the admin panel (GET / PUT /legal) – one record in the database.
  { id: 'domain.legal', template: 'shared/domain/legal.entity.ts', layer: 'domain', feature: 'legal', file: 'legal.entity.ts', when: legal },
  { id: 'contract.legal', template: 'shared/domain/legal.repository.ts', layer: 'repositoryContract', feature: 'legal', file: 'legal.repository.ts', when: legal, mergeInto: ['repo.legal'] },
  { id: 'repo.legal', template: 'shared/repositories/{orm}/legal.repository.ts', layer: 'repositoryImpl', feature: 'legal', file: repoFile('legal'), when: legal },
  { id: 'typeorm.legal', template: 'shared/database/typeorm/legal.orm-entity.ts', layer: 'model', feature: 'legal', file: 'legal.orm-entity.ts', when: all(typeorm, legal) },
  { id: 'mongoose.legal', template: 'shared/database/mongoose/legal.model.ts', layer: 'model', feature: 'legal', file: 'legal.model.ts', when: all(mongoose, legal) },
  { id: 'app.legalService', template: 'shared/application/legal.service.ts', layer: 'application', feature: 'legal', file: 'legal.service.ts', when: legal },
  // OTA updates module
  { id: 'domain.ota', template: 'shared/domain/ota.entity.ts', layer: 'domain', feature: 'ota', file: 'ota.entity.ts', when: ota },
  { id: 'contract.ota', template: 'shared/domain/ota.repository.ts', layer: 'repositoryContract', feature: 'ota', file: 'ota.repository.ts', when: ota, mergeInto: ['repo.ota'] },
  { id: 'repo.ota', template: 'shared/repositories/{orm}/ota.repository.ts', layer: 'repositoryImpl', feature: 'ota', file: repoFile('ota'), when: ota },
  { id: 'app.otaService', template: 'shared/application/ota.service.ts', layer: 'application', feature: 'ota', file: 'ota.service.ts', when: ota },
  // ── Payments: catalog, entitlements, admin screens + in-app purchases and / or a gateway ──
  { id: 'domain.payments', template: 'shared/domain/payment.entity.ts', layer: 'domain', feature: 'payments', file: 'payment.entity.ts', when: payments },
  { id: 'contract.payments', template: 'shared/domain/payments.repository.ts', layer: 'repositoryContract', feature: 'payments', file: 'payments.repository.ts', when: payments, mergeInto: ['repo.payments'] },
  { id: 'repo.payments', template: 'shared/repositories/{orm}/payments.repository.ts', layer: 'repositoryImpl', feature: 'payments', file: repoFile('payments'), when: payments },
  { id: 'app.paymentsService', template: 'shared/application/payments.service.ts', layer: 'application', feature: 'payments', file: 'payments.service.ts', when: payments },
  // The gateway (one of Stripe / Razorpay / PayPal) behind one interface – swapping it never touches the service.
  { id: 'port.paymentGateway', template: 'shared/ports/payment-gateway.ts', layer: 'ports', file: 'payment-gateway.ts', when: gateway, mergeInto: ['impl.paymentGateway'] },
  { id: 'impl.paymentGateway', template: 'shared/adapters/stripe-payment-gateway.ts', layer: 'adapters', file: 'stripe-payment-gateway.ts', when: ctx => gatewayProvider(ctx) === 'stripe' },
  { id: 'impl.paymentGateway', template: 'shared/adapters/razorpay-payment-gateway.ts', layer: 'adapters', file: 'razorpay-payment-gateway.ts', when: ctx => gatewayProvider(ctx) === 'razorpay' },
  { id: 'impl.paymentGateway', template: 'shared/adapters/paypal-payment-gateway.ts', layer: 'adapters', file: 'paypal-payment-gateway.ts', when: ctx => gatewayProvider(ctx) === 'paypal' },
  // In-app purchases: Apple / Google verification (react-native-iap) or the Adapty server API.
  { id: 'port.inAppPurchases', template: 'shared/ports/in-app-purchases.ts', layer: 'ports', file: 'in-app-purchases.ts', when: iap, mergeInto: ['impl.inAppPurchases'] },
  { id: 'impl.inAppPurchases', template: 'shared/adapters/store-purchase-verifier.ts', layer: 'adapters', file: 'store-purchase-verifier.ts', when: ctx => iapProvider(ctx) === 'iap' },
  { id: 'impl.inAppPurchases', template: 'shared/adapters/adapty-client.ts', layer: 'adapters', file: 'adapty-client.ts', when: ctx => iapProvider(ctx) === 'adapty' },
  // Database: own Prisma schema file + migration, TypeORM entities + migration, Mongoose models.
  { id: 'prisma.payments', template: 'shared/database/prisma/payments.schema.prisma', file: 'prisma/payments.prisma', when: all(prisma, payments) },
  { id: 'prisma.paymentsMigration', template: 'shared/database/prisma/payments.migration.sql', file: 'prisma/migrations/20260101000100_payments/migration.sql', when: all(prisma, payments) },
  { id: 'typeorm.payments', template: 'shared/database/typeorm/payment.orm-entities.ts', layer: 'model', feature: 'payments', file: 'payment.orm-entities.ts', when: all(typeorm, payments) },
  { id: 'typeorm.paymentsMigration', template: 'shared/database/typeorm/payments.migration.ts', layer: 'database', file: 'migrations/1767225600100-Payments.ts', when: all(typeorm, payments) },
  { id: 'mongoose.payments', template: 'shared/database/mongoose/payment.models.ts', layer: 'model', feature: 'payments', file: 'payment.models.ts', when: all(mongoose, payments) },
  { id: 'root.paymentsDoc', template: 'root/PAYMENTS.md', file: 'docs/PAYMENTS.md', when: payments },
  { id: 'test.unit.payments', template: 'shared/test/payments.spec.ts', file: 'test/unit/payments.spec.ts', when: payments },
  { id: 'test.e2e.payments', template: 'shared/test/payments.e2e-spec.ts', file: 'test/e2e/payments.e2e-spec.ts', when: payments },
  // Tests
  { id: 'test.unit.calling', template: 'shared/test/calling.spec.ts', file: 'test/unit/calling.spec.ts', when: calling },
  { id: 'test.e2e.calling', template: 'shared/test/calling.e2e-spec.ts', file: 'test/e2e/calling.e2e-spec.ts', when: calling },
  { id: 'app.container', template: 'shared/bootstrap/container.ts', layer: 'bootstrap', file: 'container.ts' },

  // ── views (MVC presenters) ──────────────────────────────────────────────────
  { id: 'views.user', template: 'shared/views/user.view.ts', layer: 'views', feature: 'users', file: 'user.view.ts', when: all(views, usersApi) },
  { id: 'views.auth', template: 'shared/views/auth.view.ts', layer: 'views', feature: 'auth', file: 'auth.view.ts', when: all(views, authApi) },

  // ── Express ───────────────────────────────────────────────────────────────
  { id: 'ex.server', template: 'express/bootstrap/server.ts', layer: 'bootstrap', file: 'server.ts', when: express },
  { id: 'ex.app', template: 'express/bootstrap/app.ts', layer: 'bootstrap', file: 'app.ts', when: express },
  // Layered / MVC have a routes/ folder: the list of every router is its index.ts.
  { id: 'ex.routes', template: 'express/bootstrap/routes.ts', layer: 'bootstrap', file: ({ arch }) => (arch.dir('routes', 'express', 'users') === 'src/routes' ? 'routes/index.ts' : 'routes.ts'), when: express },
  { id: 'ex.validation', template: 'express/http/validation.ts', layer: 'httpKernel', file: 'validation.ts', when: express },
  { id: 'ex.mw.auth', template: 'express/http/auth.middleware.ts', layer: 'httpKernel', file: 'auth.middleware.ts', when: all(express, auth) },
  { id: 'ex.mw.upload', template: 'express/http/upload.middleware.ts', layer: 'httpKernel', file: 'upload.middleware.ts', when: all(express, uploads) },
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
  // Per feature: routes (URL → controller method), controller (req/res → service), request schemas, Swagger docs.
  ...FEATURES.flatMap(([feature, enabled]): BackendManifestEntry[] => [
    { id: `ex.${feature}.routes`, template: `express/features/${feature}.routes.ts`, layer: 'routes', feature, file: `${feature}.routes.ts`, when: all(express, enabled) },
    { id: `ex.${feature}.controller`, template: `express/features/${feature}.controller.ts`, layer: 'http', feature, file: `${feature}.controller.ts`, when: all(express, enabled) },
    ...(feature === 'health'
      ? []
      : [{ id: `ex.${feature}.schemas`, template: `express/features/${feature}.schemas.ts`, layer: 'dto' as const, feature, file: `${feature}.schemas.ts`, when: all(express, enabled) }]),
    { id: `ex.${feature}.docs`, template: `express/docs/${feature}.docs.ts`, layer: 'docs', feature, file: `${feature}.docs.ts`, when: all(express, enabled, swagger) },
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
  { id: 'nest.throttlerStorage', template: 'nestjs/http/redis-throttler.storage.ts', layer: 'httpKernel', file: 'redis-throttler.storage.ts', when: all(nest, redis, rateLimit) },
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
  { id: 'test.unit.devices', template: 'shared/test/devices.spec.ts', file: 'test/unit/devices.spec.ts', when: devices },
  { id: 'test.unit.notifications', template: 'shared/test/notifications.spec.ts', file: 'test/unit/notifications.spec.ts', when: notifications },
  { id: 'test.unit.cache', template: 'shared/test/cache.spec.ts', file: 'test/unit/cache.spec.ts', when: redis },
  { id: 'test.unit.encryption', template: 'shared/test/encryption.spec.ts', file: 'test/unit/encryption.spec.ts', when: encryption },
  { id: 'test.e2e.health', template: 'shared/test/health.e2e-spec.ts', file: 'test/e2e/health.e2e-spec.ts' },
  { id: 'test.e2e.auth', template: 'shared/test/auth.e2e-spec.ts', file: 'test/e2e/auth.e2e-spec.ts', when: authApi },
  { id: 'test.e2e.users', template: 'shared/test/users.e2e-spec.ts', file: 'test/e2e/users.e2e-spec.ts', when: usersApi },
  { id: 'test.e2e.chat', template: 'shared/test/chat.e2e-spec.ts', file: 'test/e2e/chat.e2e-spec.ts', when: chat },
  { id: 'test.e2e.devices', template: 'shared/test/devices.e2e-spec.ts', file: 'test/e2e/devices.e2e-spec.ts', when: devices },
  { id: 'test.e2e.notifications', template: 'shared/test/notifications.e2e-spec.ts', file: 'test/e2e/notifications.e2e-spec.ts', when: notifications },
  { id: 'test.e2e.legal', template: 'shared/test/legal.e2e-spec.ts', file: 'test/e2e/legal.e2e-spec.ts', when: legal },
];
