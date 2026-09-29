import type { Database } from '{{IMPORT:db.connection}}';
{{#if AUTH_REFRESH}}
import type { RefreshTokensRepository } from '{{IMPORT:contract.auth}}';
{{/if}}
{{#if CODES}}
import type { VerificationCodesRepository } from '{{IMPORT:contract.auth}}';
{{/if}}
{{#if SOCIAL}}
import type { SocialAccountsRepository } from '{{IMPORT:contract.auth}}';
{{/if}}
{{#if CHAT}}
import type { ChatRepository } from '{{IMPORT:contract.chat}}';
{{/if}}
{{#if DEVICES}}
import type { DevicesRepository } from '{{IMPORT:contract.devices}}';
{{/if}}
{{#if NOTIFICATIONS}}
import type { NotificationsRepository } from '{{IMPORT:contract.notifications}}';
{{/if}}
import type { UsersRepository } from '{{IMPORT:contract.users}}';
{{#if AUTH_REFRESH}}
import { MongooseRefreshTokensRepository } from '{{IMPORT:repo.auth}}';
{{/if}}
{{#if DB_CODES}}
import { MongooseVerificationCodesRepository } from '{{IMPORT:repo.auth}}';
{{/if}}
{{#if SOCIAL}}
import { MongooseSocialAccountsRepository } from '{{IMPORT:repo.auth}}';
{{/if}}
{{#if CHAT}}
import { MongooseChatRepository } from '{{IMPORT:repo.chat}}';
{{/if}}
{{#if DEVICES}}
import { MongooseDevicesRepository } from '{{IMPORT:repo.devices}}';
{{/if}}
{{#if NOTIFICATIONS}}
import { MongooseNotificationsRepository } from '{{IMPORT:repo.notifications}}';
{{/if}}
import { MongooseUsersRepository } from '{{IMPORT:repo.users}}';
{{#if REDIS_CODES}}
import { requireRedis } from '{{IMPORT:db.redis}}';
import { RedisVerificationCodesRepository } from '{{IMPORT:repo.redisCodes}}';
{{/if}}

/** Every repository the services need – one object, so wiring never depends on the ORM. */
export interface Repositories {
  users: UsersRepository;
{{#if AUTH_REFRESH}}
  refreshTokens: RefreshTokensRepository;
{{/if}}
{{#if CODES}}
  verificationCodes: VerificationCodesRepository;
{{/if}}
{{#if SOCIAL}}
  socialAccounts: SocialAccountsRepository;
{{/if}}
{{#if CHAT}}
  chat: ChatRepository;
{{/if}}
{{#if DEVICES}}
  devices: DevicesRepository;
{{/if}}
{{#if NOTIFICATIONS}}
  notifications: NotificationsRepository;
{{/if}}
}

/** Mongoose models use the default connection opened by `createDatabase()`. */
export function createRepositories(_database: Database): Repositories {
  return {
    users: new MongooseUsersRepository(),
{{#if AUTH_REFRESH}}
    refreshTokens: new MongooseRefreshTokensRepository(),
{{/if}}
{{#if DB_CODES}}
    verificationCodes: new MongooseVerificationCodesRepository(),
{{/if}}
{{#if REDIS_CODES}}
    // Codes expire by themselves in Redis (REDIS_URL).
    verificationCodes: new RedisVerificationCodesRepository(requireRedis()),
{{/if}}
{{#if SOCIAL}}
    socialAccounts: new MongooseSocialAccountsRepository(),
{{/if}}
{{#if CHAT}}
    chat: new MongooseChatRepository(),
{{/if}}
{{#if DEVICES}}
    devices: new MongooseDevicesRepository(),
{{/if}}
{{#if NOTIFICATIONS}}
    notifications: new MongooseNotificationsRepository(),
{{/if}}
  };
}
