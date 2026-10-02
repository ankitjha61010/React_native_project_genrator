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
{{#if CALLING}}
import type { ICallingRepository } from '{{IMPORT:contract.calling}}';
{{/if}}
{{#if LEGAL}}
import type { LegalRepository } from '{{IMPORT:contract.legal}}';
{{/if}}
{{#if OTA}}
import type { OTARepository } from '{{IMPORT:contract.ota}}';
{{/if}}
{{#if PAYMENTS}}
import type { PaymentsRepository } from '{{IMPORT:contract.payments}}';
{{/if}}
import type { UsersRepository } from '{{IMPORT:contract.users}}';
{{#if AUTH_REFRESH}}
import { TypeOrmRefreshTokensRepository } from '{{IMPORT:repo.auth}}';
{{/if}}
{{#if DB_CODES}}
import { TypeOrmVerificationCodesRepository } from '{{IMPORT:repo.auth}}';
{{/if}}
{{#if SOCIAL}}
import { TypeOrmSocialAccountsRepository } from '{{IMPORT:repo.auth}}';
{{/if}}
{{#if CHAT}}
import { TypeOrmChatRepository } from '{{IMPORT:repo.chat}}';
{{/if}}
{{#if DEVICES}}
import { TypeOrmDevicesRepository } from '{{IMPORT:repo.devices}}';
{{/if}}
{{#if NOTIFICATIONS}}
import { TypeOrmNotificationsRepository } from '{{IMPORT:repo.notifications}}';
{{/if}}
{{#if CALLING}}
import { TypeOrmCallingRepository } from '{{IMPORT:repo.calling}}';
{{/if}}
{{#if LEGAL}}
import { TypeOrmLegalRepository } from '{{IMPORT:repo.legal}}';
{{/if}}
{{#if OTA}}
import { TypeOrmOTARepository } from '{{IMPORT:repo.ota}}';
{{/if}}
{{#if PAYMENTS}}
import { TypeOrmPaymentsRepository } from '{{IMPORT:repo.payments}}';
{{/if}}
import { TypeOrmUsersRepository } from '{{IMPORT:repo.users}}';
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
{{#if CALLING}}
  calling: ICallingRepository;
{{/if}}
{{#if LEGAL}}
  legal: LegalRepository;
{{/if}}
{{#if OTA}}
  ota: OTARepository;
{{/if}}
{{#if PAYMENTS}}
  payments: PaymentsRepository;
{{/if}}
}

export function createRepositories(database: Database): Repositories {
  const { dataSource } = database;
  return {
    users: new TypeOrmUsersRepository(dataSource),
{{#if AUTH_REFRESH}}
    refreshTokens: new TypeOrmRefreshTokensRepository(dataSource),
{{/if}}
{{#if DB_CODES}}
    verificationCodes: new TypeOrmVerificationCodesRepository(dataSource),
{{/if}}
{{#if REDIS_CODES}}
    // Codes expire by themselves in Redis (REDIS_URL).
    verificationCodes: new RedisVerificationCodesRepository(requireRedis()),
{{/if}}
{{#if SOCIAL}}
    socialAccounts: new TypeOrmSocialAccountsRepository(dataSource),
{{/if}}
{{#if CHAT}}
    chat: new TypeOrmChatRepository(dataSource),
{{/if}}
{{#if DEVICES}}
    devices: new TypeOrmDevicesRepository(dataSource),
{{/if}}
{{#if NOTIFICATIONS}}
    notifications: new TypeOrmNotificationsRepository(dataSource),
{{/if}}
{{#if CALLING}}
    calling: new TypeOrmCallingRepository(dataSource),
{{/if}}
{{#if LEGAL}}
    legal: new TypeOrmLegalRepository(dataSource),
{{/if}}
{{#if OTA}}
    ota: new TypeOrmOTARepository(dataSource),
{{/if}}
{{#if PAYMENTS}}
    payments: new TypeOrmPaymentsRepository(dataSource),
{{/if}}
  };
}
