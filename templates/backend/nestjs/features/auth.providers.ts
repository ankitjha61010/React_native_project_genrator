import type { Provider } from '@nestjs/common';
import { logger } from '{{IMPORT:core.logger}}';
import type { Database } from '{{IMPORT:db.connection}}';
{{#if AUTH_REFRESH}}
import type { RefreshTokensRepository } from '{{IMPORT:contract.refreshTokens}}';
{{/if}}
import type { UserTokensRepository } from '{{IMPORT:contract.userTokens}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { Mailer } from '{{IMPORT:port.mailer}}';
import type { PasswordHasher } from '{{IMPORT:port.passwordHasher}}';
import type { TokenService } from '{{IMPORT:port.tokenService}}';
import type { AuthSettings } from '{{IMPORT:app.authTypes}}';
{{#if PRISMA}}
{{#if AUTH_REFRESH}}
import { PrismaRefreshTokensRepository } from '{{IMPORT:repo.refreshTokens}}';
{{/if}}
import { PrismaUserTokensRepository } from '{{IMPORT:repo.userTokens}}';
{{/if}}
{{#if TYPEORM}}
{{#if AUTH_REFRESH}}
import { TypeOrmRefreshTokensRepository } from '{{IMPORT:repo.refreshTokens}}';
{{/if}}
import { TypeOrmUserTokensRepository } from '{{IMPORT:repo.userTokens}}';
{{/if}}
{{#if MONGOOSE}}
{{#if AUTH_REFRESH}}
import { MongooseRefreshTokensRepository } from '{{IMPORT:repo.refreshTokens}}';
{{/if}}
import { MongooseUserTokensRepository } from '{{IMPORT:repo.userTokens}}';
{{/if}}
{{#if STYLE_SERVICE}}
import { AuthService } from '{{IMPORT:app.authService}}';
{{else}}
import { AuthenticateUseCase } from '{{IMPORT:uc.authenticate}}';
import { OneTimeTokens, SessionManager } from '{{IMPORT:uc.support}}';
import { ChangePasswordUseCase } from '{{IMPORT:uc.changePassword}}';
import { GetCurrentUserUseCase } from '{{IMPORT:uc.getCurrentUser}}';
import { LoginUseCase } from '{{IMPORT:uc.login}}';
{{#if AUTH_REFRESH}}
import { LogoutAllUseCase } from '{{IMPORT:uc.logoutAll}}';
import { RefreshSessionUseCase } from '{{IMPORT:uc.refreshSession}}';
{{/if}}
import { LogoutUseCase } from '{{IMPORT:uc.logout}}';
import { RegisterUseCase } from '{{IMPORT:uc.register}}';
import { RequestEmailVerificationUseCase } from '{{IMPORT:uc.requestEmailVerification}}';
import { RequestPasswordResetUseCase } from '{{IMPORT:uc.requestPasswordReset}}';
import { ResetPasswordUseCase } from '{{IMPORT:uc.resetPassword}}';
import { VerifyEmailUseCase } from '{{IMPORT:uc.verifyEmail}}';
{{/if}}
import {
{{#if STYLE_USECASE}}
  AUTH_USE_CASES,
{{/if}}
  AUTH_SETTINGS,
  DATABASE,
  MAILER,
  PASSWORD_HASHER,
{{#if AUTH_REFRESH}}
  REFRESH_TOKENS_REPOSITORY,
{{/if}}
  TOKEN_SERVICE,
  USER_TOKENS_REPOSITORY,
  USERS_REPOSITORY,
} from '{{IMPORT:nest.tokens}}';

interface AuthDependencies {
  users: UsersRepository;
{{#if AUTH_REFRESH}}
  refreshTokens: RefreshTokensRepository;
{{/if}}
  userTokens: UserTokensRepository;
  hasher: PasswordHasher;
  tokens: TokenService;
  mailer: Mailer;
  settings: AuthSettings;
}
{{#if STYLE_USECASE}}

export function createAuthUseCases({ users, {{#if AUTH_REFRESH}}refreshTokens, {{/if}}userTokens, hasher, tokens, mailer, settings }: AuthDependencies) {
  const sessions = new SessionManager(users, {{#if AUTH_REFRESH}}refreshTokens, {{/if}}tokens);
  const oneTimeTokens = new OneTimeTokens(userTokens, mailer, settings, logger);
  return {
    authenticate: new AuthenticateUseCase(users, tokens),
    register: new RegisterUseCase(users, hasher, sessions, oneTimeTokens, settings, logger),
    login: new LoginUseCase(users, hasher, sessions, {{#if SEC_LOCKOUT}}settings, {{/if}}logger),
{{#if AUTH_REFRESH}}
    refresh: new RefreshSessionUseCase(users, refreshTokens, tokens, sessions{{#if AUTH_ROTATION}}, logger{{/if}}),
    logout: new LogoutUseCase(refreshTokens, tokens),
    logoutAll: new LogoutAllUseCase(users, sessions),
{{else}}
    logout: new LogoutUseCase(users, sessions),
{{/if}}
    getCurrentUser: new GetCurrentUserUseCase(users),
    changePassword: new ChangePasswordUseCase(users, hasher, sessions, settings, logger),
    requestPasswordReset: new RequestPasswordResetUseCase(users, oneTimeTokens),
    resetPassword: new ResetPasswordUseCase(users, hasher, oneTimeTokens, sessions, settings, logger),
    requestEmailVerification: new RequestEmailVerificationUseCase(users, oneTimeTokens),
    verifyEmail: new VerifyEmailUseCase(users, oneTimeTokens),
  };
}

export type AuthUseCases = ReturnType<typeof createAuthUseCases>;
{{/if}}

const DEPENDENCIES = [USERS_REPOSITORY, {{#if AUTH_REFRESH}}REFRESH_TOKENS_REPOSITORY, {{/if}}USER_TOKENS_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE, MAILER, AUTH_SETTINGS];

function dependencies(
  users: UsersRepository,
{{#if AUTH_REFRESH}}
  refreshTokens: RefreshTokensRepository,
{{/if}}
  userTokens: UserTokensRepository,
  hasher: PasswordHasher,
  tokens: TokenService,
  mailer: Mailer,
  settings: AuthSettings,
): AuthDependencies {
  return { users, {{#if AUTH_REFRESH}}refreshTokens, {{/if}}userTokens, hasher, tokens, mailer, settings };
}

/** Wiring of the auth feature: ORM repositories → {{#if STYLE_SERVICE}}AuthService{{else}}use-cases{{/if}}. */
export const authProviders: Provider[] = [
{{#if AUTH_REFRESH}}
  {
    provide: REFRESH_TOKENS_REPOSITORY,
{{#if PRISMA}}
    useFactory: (database: Database) => new PrismaRefreshTokensRepository(database.client),
{{/if}}
{{#if TYPEORM}}
    useFactory: (database: Database) => new TypeOrmRefreshTokensRepository(database.dataSource),
{{/if}}
{{#if MONGOOSE}}
    useFactory: (_database: Database) => new MongooseRefreshTokensRepository(),
{{/if}}
    inject: [DATABASE],
  },
{{/if}}
  {
    provide: USER_TOKENS_REPOSITORY,
{{#if PRISMA}}
    useFactory: (database: Database) => new PrismaUserTokensRepository(database.client),
{{/if}}
{{#if TYPEORM}}
    useFactory: (database: Database) => new TypeOrmUserTokensRepository(database.dataSource),
{{/if}}
{{#if MONGOOSE}}
    useFactory: (_database: Database) => new MongooseUserTokensRepository(),
{{/if}}
    inject: [DATABASE],
  },
{{#if STYLE_SERVICE}}
  {
    provide: AuthService,
    useFactory: (...args: Parameters<typeof dependencies>) => {
      const d = dependencies(...args);
      return new AuthService(d.users, {{#if AUTH_REFRESH}}d.refreshTokens, {{/if}}d.userTokens, d.hasher, d.tokens, d.mailer, d.settings, logger);
    },
    inject: DEPENDENCIES,
  },
{{else}}
  {
    provide: AUTH_USE_CASES,
    useFactory: (...args: Parameters<typeof dependencies>) => createAuthUseCases(dependencies(...args)),
    inject: DEPENDENCIES,
  },
{{/if}}
];
