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
import { PrismaRefreshTokensRepository } from '{{IMPORT:repo.auth}}';
{{/if}}
{{#if DB_CODES}}
import { PrismaVerificationCodesRepository } from '{{IMPORT:repo.auth}}';
{{/if}}
{{#if SOCIAL}}
import { PrismaSocialAccountsRepository } from '{{IMPORT:repo.auth}}';
{{/if}}
{{#if CHAT}}
import { PrismaChatRepository } from '{{IMPORT:repo.chat}}';
{{/if}}
{{#if DEVICES}}
import { PrismaDevicesRepository } from '{{IMPORT:repo.devices}}';
{{/if}}
{{#if NOTIFICATIONS}}
import { PrismaNotificationsRepository } from '{{IMPORT:repo.notifications}}';
{{/if}}
import { PrismaUsersRepository } from '{{IMPORT:repo.users}}';
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

export function createRepositories(database: Database): Repositories {
  const { client } = database;
  return {
    users: new PrismaUsersRepository(client),
{{#if AUTH_REFRESH}}
    refreshTokens: new PrismaRefreshTokensRepository(client),
{{/if}}
{{#if DB_CODES}}
    verificationCodes: new PrismaVerificationCodesRepository(client),
{{/if}}
{{#if REDIS_CODES}}
    // Codes expire by themselves in Redis (REDIS_URL).
    verificationCodes: new RedisVerificationCodesRepository(requireRedis()),
{{/if}}
{{#if SOCIAL}}
    socialAccounts: new PrismaSocialAccountsRepository(client),
{{/if}}
{{#if CHAT}}
    chat: new PrismaChatRepository(client),
{{/if}}
{{#if DEVICES}}
    devices: new PrismaDevicesRepository(client),
{{/if}}
{{#if NOTIFICATIONS}}
    notifications: new PrismaNotificationsRepository(client),
{{/if}}
  };
}
