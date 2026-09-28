{{#if AUTH}}
import { config } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:core.logger}}';
{{/if}}
import type { Database } from '{{IMPORT:db.connection}}';
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
{{#if NOTIFICATIONS}}
import { NotificationsService } from '{{IMPORT:app.notificationsService}}';
{{/if}}
{{#if USERS_API}}
import { UsersService } from '{{IMPORT:app.usersService}}';
{{/if}}

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
  const eventBus = createEventBus(config.events.redisUrl, logger);
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
    healthChecks: [database.healthCheck{{#if EVENTS}}, eventBus.healthCheck{{/if}}],
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

/**
 * Composition root: the one place that builds every service. Express and the tests use it
 * directly{{#if NEST}}; Nest exposes each service as a provider (core.module.ts){{/if}}.
 */
export function createServices(infra: Infrastructure) {
  const repos = infra.repositories;
{{#if AUTH}}
  // Resolves the user behind an access token (routes, sockets).
  const sessions = new Sessions(repos.users, {{#if AUTH_REFRESH}}repos.refreshTokens, {{/if}}infra.tokenService{{#if AUTH_ROTATION}}, logger{{/if}});
{{/if}}
{{#if NOTIFICATIONS}}
  const notifications = new NotificationsService({ notifications: repos.notifications, users: repos.users, pushSender: infra.pushSender, realtime: infra.realtime, logger });
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
    users: new UsersService(repos.users, infra.storage, logger),
{{else}}
    users: new UsersService(repos.users),
{{/if}}
{{/if}}
    health: new HealthService(infra.healthChecks),
{{#if NOTIFICATIONS}}
    notifications,
{{/if}}
{{#if CHAT}}
    chat: new ChatService({
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
    }),
{{/if}}
  };
}

export type Services = ReturnType<typeof createServices>;
