{{#if AUTH}}
import { config } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:core.logger}}';
{{/if}}
import type { Database } from '{{IMPORT:db.connection}}';
{{#if REDIS}}
import { redis, redisHealthCheck } from '{{IMPORT:db.redis}}';
{{/if}}
import { createRepositories, type Repositories } from '{{IMPORT:db.repositories}}';
import type { HealthCheck } from '{{IMPORT:port.healthCheck}}';
{{#if AUTH}}
import type { TokenService } from '{{IMPORT:port.tokenService}}';
import { JwtTokenService } from '{{IMPORT:impl.tokenService}}';
{{/if}}
{{#if UPLOADS}}
import type { FileStorage } from '{{IMPORT:port.fileStorage}}';
import { LocalFileStorage } from '{{IMPORT:impl.fileStorage}}';
{{/if}}
{{#if AUTH_EMAIL}}
import type { Mailer } from '{{IMPORT:port.mailer}}';
import type { PasswordHasher } from '{{IMPORT:port.passwordHasher}}';
import { createMailer } from '{{IMPORT:impl.mailer}}';
import { createPasswordHasher } from '{{IMPORT:impl.passwordHasher}}';
{{/if}}
{{#if AUTH_OTP}}
import type { SmsSender } from '{{IMPORT:port.smsSender}}';
import { createSmsSender } from '{{IMPORT:impl.smsSender}}';
{{/if}}
{{#if SOCIAL}}
import type { SocialVerifier } from '{{IMPORT:port.socialVerifier}}';
import { ProviderSocialVerifier } from '{{IMPORT:impl.socialVerifier}}';
{{/if}}
{{#if NOTIFICATIONS}}
import type { PushSender } from '{{IMPORT:port.pushSender}}';
import { createPushSender } from '{{IMPORT:impl.pushSender}}';
{{/if}}
{{#if REALTIME}}
import type { Realtime } from '{{IMPORT:port.realtime}}';
{{/if}}
{{#if SOCKET_SERVER}}
import { SocketHub } from '{{IMPORT:realtime.server}}';
{{/if}}
{{#if EVENTS}}
import type { EventBus } from '{{IMPORT:port.eventBus}}';
import { createEventBus } from '{{IMPORT:impl.eventBus}}';
{{/if}}
{{#if REALTIME_EVENTS}}
import { EventRealtime } from '{{IMPORT:events.realtime}}';
{{/if}}
{{#if SVC_IDENTITY}}
import { PublishingUsersRepository } from '{{IMPORT:events.usersPublisher}}';
{{/if}}
{{#if PUSH_EVENTS}}
import { EVENT_CHANNELS } from '{{IMPORT:port.eventBus}}';
{{/if}}
{{#if AUTH_API}}
{{#if CODES}}
import { VerificationCodes } from '{{IMPORT:app.authCodes}}';
{{/if}}
import { AuthService } from '{{IMPORT:app.authService}}';
import type { AuthSettings } from '{{IMPORT:app.authTypes}}';
{{/if}}
{{#if AUTH}}
import { Sessions } from '{{IMPORT:app.authSessions}}';
{{/if}}
{{#if CHAT}}
import { ChatService } from '{{IMPORT:app.chatService}}';
{{/if}}
import { HealthService } from '{{IMPORT:app.healthService}}';
{{#if DEVICES}}
import { DevicesService } from '{{IMPORT:app.devicesService}}';
{{/if}}
{{#if NOTIFICATIONS}}
import { NotificationsService } from '{{IMPORT:app.notificationsService}}';
{{/if}}
{{#if USERS_API}}
import { UsersService } from '{{IMPORT:app.usersService}}';
{{/if}}

/*
 * container.ts – where the app is put together. Nothing else creates services.
 *
 *   1. createInfrastructure() – the things that talk to the outside world: the database{{#if AUTH}}, JWT{{/if}}{{#if AUTH_EMAIL}}, email{{/if}}{{#if AUTH_OTP}}, SMS{{/if}}{{#if UPLOADS}}, file storage{{/if}}…
 *   2. createServices()       – the business logic ({{#if AUTH_API}}auth, {{/if}}{{#if USERS_API}}users, {{/if}}{{#if CHAT}}chat, {{/if}}{{#if DEVICES}}devices, {{/if}}{{#if NOTIFICATIONS}}notifications, {{/if}}health), each given what it needs.
 *
 * {{#if NEST}}Nest injects these services into the controllers (core.module.ts){{else}}app.ts hands them to the routes{{/if}}. The tests call createServices() with in-memory
 * infrastructure instead, so they run without a database.
 *
 * Adding a service: create it in createServices() and add it to the returned object.
 */

/** Everything that touches the outside world – tests pass in-memory versions instead. */
export interface Infrastructure {
  repositories: Repositories;
  healthChecks: HealthCheck[];
{{#if AUTH}}
  tokenService: TokenService;
{{/if}}
{{#if UPLOADS}}
  storage: FileStorage;
{{/if}}
{{#if AUTH_EMAIL}}
  passwordHasher: PasswordHasher;
  mailer: Mailer;
{{/if}}
{{#if AUTH_OTP}}
  sms: SmsSender;
{{/if}}
{{#if SOCIAL}}
  socialVerifier: SocialVerifier;
{{/if}}
{{#if NOTIFICATIONS}}
  pushSender: PushSender;
{{/if}}
{{#if REALTIME}}
  realtime: Realtime;
{{/if}}
{{#if EVENTS}}
  /** Events between the services (Redis). */
  eventBus: EventBus;
{{/if}}
}

/** The real infrastructure: database repositories + configured providers. */
export function createInfrastructure(database: Database): Infrastructure {
{{#if EVENTS}}
  const eventBus = createEventBus(config.redis.url, logger);
{{/if}}
{{#if SVC_IDENTITY}}
  const repositories = createRepositories(database);
  // Other services keep a copy of the users – tell them about every change.
  repositories.users = new PublishingUsersRepository(repositories.users, eventBus, logger);
{{/if}}
  return {
{{#if SVC_IDENTITY}}
    repositories,
{{else}}
    repositories: createRepositories(database),
{{/if}}
    healthChecks: [database.healthCheck{{#if EVENTS}}, eventBus.healthCheck{{/if}}{{#if REDIS}}, ...(redis ? [redisHealthCheck] : []){{/if}}],
{{#if AUTH}}
    tokenService: new JwtTokenService(config.jwt),
{{/if}}
{{#if UPLOADS}}
    storage: new LocalFileStorage(config.uploads.dir, `${config.appUrl}${config.uploads.publicPath}`),
{{/if}}
{{#if AUTH_EMAIL}}
{{#if HASH_ARGON2}}
    passwordHasher: createPasswordHasher(),
{{else}}
    passwordHasher: createPasswordHasher(config.password),
{{/if}}
    mailer: createMailer(config.mail, logger, config.isProduction),
{{/if}}
{{#if AUTH_OTP}}
    sms: createSmsSender(config.sms, logger, config.isProduction),
{{/if}}
{{#if SOCIAL}}
    socialVerifier: new ProviderSocialVerifier(config.social),
{{/if}}
{{#if NOTIFICATIONS}}
    pushSender: createPushSender(config.firebase.serviceAccount, logger),
{{/if}}
{{#if SOCKET_SERVER}}
    // Starts forwarding once the Socket.IO server is attached to the HTTP server.
    realtime: new SocketHub(),
{{/if}}
{{#if REALTIME_EVENTS}}
    // The chat service holds the sockets – live events go to it through the event bus.
    realtime: new EventRealtime(eventBus),
{{/if}}
{{#if EVENTS}}
    eventBus,
{{/if}}
  };
}
{{#if AUTH_API}}

export function authSettings(): AuthSettings {
  return {
    appName: '{{DISPLAY_NAME}}',
{{#if CODES}}
    codes: config.codes,
{{/if}}
{{#if AUTH_EMAIL}}
    password: { minLength: config.password.minLength, maxLength: config.password.maxLength },
{{/if}}
{{#if SEC_LOCKOUT}}
    lockout: config.lockout,
{{/if}}
  };
}
{{/if}}

/** Builds every service from the infrastructure. */
export function createServices(infra: Infrastructure) {
  const repos = infra.repositories;
{{#if AUTH}}
  // Resolves the user behind an access token (routes, sockets).
  const sessions = new Sessions(repos.users, {{#if AUTH_REFRESH}}repos.refreshTokens, {{/if}}infra.tokenService{{#if AUTH_ROTATION}}, logger{{/if}});
{{/if}}
{{#if DEVICES}}
  const devices = new DevicesService(repos.devices);
{{/if}}
{{#if NOTIFICATIONS}}
  const notifications = new NotificationsService({ notifications: repos.notifications, devices, users: repos.users, pushSender: infra.pushSender, realtime: infra.realtime, logger });
{{/if}}

{{#if CHAT}}
  const chat = new ChatService({
    chat: repos.chat,
    users: repos.users,
    storage: infra.storage,
    realtime: infra.realtime,
{{#if NOTIFICATIONS}}
    push: (userIds, message) => notifications.push(userIds, message),
{{/if}}
{{#if PUSH_EVENTS}}
    // The notifications service sends it (it owns the devices).
    push: (userIds, message) => infra.eventBus.publish(EVENT_CHANNELS.push, { userIds, message }),
{{/if}}
    logger,
  });
{{/if}}

  return {
{{#if AUTH}}
    sessions,
{{/if}}
{{#if AUTH_API}}
    auth: new AuthService({
      users: repos.users,
      sessions,
{{#if CODES}}
      codes: new VerificationCodes(repos.verificationCodes, config.codes),
{{/if}}
{{#if AUTH_EMAIL}}
      hasher: infra.passwordHasher,
      mailer: infra.mailer,
{{/if}}
{{#if AUTH_OTP}}
      sms: infra.sms,
{{/if}}
{{#if SOCIAL}}
      socialAccounts: repos.socialAccounts,
      socialVerifier: infra.socialVerifier,
{{/if}}
      settings: authSettings(),
      logger,
    }),
{{/if}}
{{#if USERS_API}}
{{#if AUTH}}
{{#if GROUP_CHAT}}
    // Before an account is deleted its groups get a new admin.
    users: new UsersService(repos.users, infra.storage, logger, userId => chat.leaveAllGroups(userId)),
{{else}}
    users: new UsersService(repos.users, infra.storage, logger),
{{/if}}
{{else}}
    users: new UsersService(repos.users),
{{/if}}
{{/if}}
    health: new HealthService(infra.healthChecks),
{{#if DEVICES}}
    devices,
{{/if}}
{{#if NOTIFICATIONS}}
    notifications,
{{/if}}
{{#if CHAT}}
    chat,
{{/if}}
  };
}

export type Services = ReturnType<typeof createServices>;
