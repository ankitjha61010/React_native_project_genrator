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
{{#if NOTIFICATIONS}}
import type { NotificationsRepository } from '{{IMPORT:contract.notifications}}';
{{/if}}
import type { UsersRepository } from '{{IMPORT:contract.users}}';
{{#if AUTH_REFRESH}}
import { TypeOrmRefreshTokensRepository } from '{{IMPORT:repo.auth}}';
{{/if}}
{{#if CODES}}
import { TypeOrmVerificationCodesRepository } from '{{IMPORT:repo.auth}}';
{{/if}}
{{#if SOCIAL}}
import { TypeOrmSocialAccountsRepository } from '{{IMPORT:repo.auth}}';
{{/if}}
{{#if CHAT}}
import { TypeOrmChatRepository } from '{{IMPORT:repo.chat}}';
{{/if}}
{{#if NOTIFICATIONS}}
import { TypeOrmNotificationsRepository } from '{{IMPORT:repo.notifications}}';
{{/if}}
import { TypeOrmUsersRepository } from '{{IMPORT:repo.users}}';

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
{{#if NOTIFICATIONS}}
  notifications: NotificationsRepository;
{{/if}}
}

export function createRepositories(database: Database): Repositories {
  const { dataSource } = database;
  return {
    users: new TypeOrmUsersRepository(dataSource),
{{#if AUTH_REFRESH}}
    refreshTokens: new TypeOrmRefreshTokensRepository(dataSource),
{{/if}}
{{#if CODES}}
    verificationCodes: new TypeOrmVerificationCodesRepository(dataSource),
{{/if}}
{{#if SOCIAL}}
    socialAccounts: new TypeOrmSocialAccountsRepository(dataSource),
{{/if}}
{{#if CHAT}}
    chat: new TypeOrmChatRepository(dataSource),
{{/if}}
{{#if NOTIFICATIONS}}
    notifications: new TypeOrmNotificationsRepository(dataSource),
{{/if}}
  };
}
