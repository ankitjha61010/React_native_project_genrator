{{#if AUTH}}
import { config } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:core.logger}}';
{{/if}}
import type { Database } from '{{IMPORT:db.connection}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
{{#if AUTH}}
{{#if AUTH_REFRESH}}
import type { RefreshTokensRepository } from '{{IMPORT:contract.refreshTokens}}';
{{/if}}
import type { UserTokensRepository } from '{{IMPORT:contract.userTokens}}';
import type { Mailer } from '{{IMPORT:port.mailer}}';
import type { PasswordHasher } from '{{IMPORT:port.passwordHasher}}';
import type { TokenService } from '{{IMPORT:port.tokenService}}';
import { LogMailer } from '{{IMPORT:impl.mailer}}';
import { createPasswordHasher } from '{{IMPORT:impl.passwordHasher}}';
import { JwtTokenService } from '{{IMPORT:impl.tokenService}}';
import type { AuthSettings } from '{{IMPORT:app.authTypes}}';
{{/if}}
import type { HealthCheck } from '{{IMPORT:port.healthCheck}}';
{{#if PRISMA}}
import { PrismaUsersRepository } from '{{IMPORT:repo.users}}';
{{#if AUTH_REFRESH}}
import { PrismaRefreshTokensRepository } from '{{IMPORT:repo.refreshTokens}}';
{{/if}}
{{#if AUTH}}
import { PrismaUserTokensRepository } from '{{IMPORT:repo.userTokens}}';
{{/if}}
{{/if}}
{{#if TYPEORM}}
import { TypeOrmUsersRepository } from '{{IMPORT:repo.users}}';
{{#if AUTH_REFRESH}}
import { TypeOrmRefreshTokensRepository } from '{{IMPORT:repo.refreshTokens}}';
{{/if}}
{{#if AUTH}}
import { TypeOrmUserTokensRepository } from '{{IMPORT:repo.userTokens}}';
{{/if}}
{{/if}}
{{#if MONGOOSE}}
import { MongooseUsersRepository } from '{{IMPORT:repo.users}}';
{{#if AUTH_REFRESH}}
import { MongooseRefreshTokensRepository } from '{{IMPORT:repo.refreshTokens}}';
{{/if}}
{{#if AUTH}}
import { MongooseUserTokensRepository } from '{{IMPORT:repo.userTokens}}';
{{/if}}
{{/if}}
{{#if MODULE_FACTORIES}}
{{#if AUTH}}
import { createAuthModule } from '{{IMPORT:ex.module.auth}}';
{{/if}}
import { createHealthModule } from '{{IMPORT:ex.module.health}}';
import { createUsersModule } from '{{IMPORT:ex.module.users}}';
{{else}}
{{#if STYLE_SERVICE}}
{{#if AUTH}}
import { AuthService } from '{{IMPORT:app.authService}}';
{{/if}}
import { HealthService } from '{{IMPORT:app.healthService}}';
import { UsersService } from '{{IMPORT:app.usersService}}';
{{else}}
{{#if AUTH}}
import { AuthenticateUseCase } from '{{IMPORT:uc.authenticate}}';
import { OneTimeTokens, SessionManager } from '{{IMPORT:uc.support}}';
import { ChangePasswordUseCase } from '{{IMPORT:uc.changePassword}}';
import { GetCurrentUserUseCase } from '{{IMPORT:uc.getCurrentUser}}';
import { LoginUseCase } from '{{IMPORT:uc.login}}';
{{#if AUTH_REFRESH}}
import { LogoutAllUseCase } from '{{IMPORT:uc.logoutAll}}';
{{/if}}
import { LogoutUseCase } from '{{IMPORT:uc.logout}}';
{{#if AUTH_REFRESH}}
import { RefreshSessionUseCase } from '{{IMPORT:uc.refreshSession}}';
{{/if}}
import { RegisterUseCase } from '{{IMPORT:uc.register}}';
import { RequestEmailVerificationUseCase } from '{{IMPORT:uc.requestEmailVerification}}';
import { RequestPasswordResetUseCase } from '{{IMPORT:uc.requestPasswordReset}}';
import { ResetPasswordUseCase } from '{{IMPORT:uc.resetPassword}}';
import { VerifyEmailUseCase } from '{{IMPORT:uc.verifyEmail}}';
import { UpdateProfileUseCase } from '{{IMPORT:uc.updateProfile}}';
{{else}}
import { CreateUserUseCase } from '{{IMPORT:uc.createUser}}';
{{/if}}
import { CheckHealthUseCase } from '{{IMPORT:uc.checkHealth}}';
import { DeleteUserUseCase } from '{{IMPORT:uc.deleteUser}}';
import { GetUserUseCase } from '{{IMPORT:uc.getUser}}';
import { ListUsersUseCase } from '{{IMPORT:uc.listUsers}}';
import { UpdateUserUseCase } from '{{IMPORT:uc.updateUser}}';
{{/if}}
{{/if}}

/** Everything that touches the outside world – replaced by in-memory fakes in tests. */
export interface Infrastructure {
  usersRepository: UsersRepository;
{{#if AUTH}}
{{#if AUTH_REFRESH}}
  refreshTokensRepository: RefreshTokensRepository;
{{/if}}
  userTokensRepository: UserTokensRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
  mailer: Mailer;
{{/if}}
  healthChecks: HealthCheck[];
}

/** The real infrastructure, backed by the database. */
export function createInfrastructure(database: Database): Infrastructure {
  return {
{{#if PRISMA}}
    usersRepository: new PrismaUsersRepository(database.client),
{{#if AUTH_REFRESH}}
    refreshTokensRepository: new PrismaRefreshTokensRepository(database.client),
{{/if}}
{{#if AUTH}}
    userTokensRepository: new PrismaUserTokensRepository(database.client),
{{/if}}
{{/if}}
{{#if TYPEORM}}
    usersRepository: new TypeOrmUsersRepository(database.dataSource),
{{#if AUTH_REFRESH}}
    refreshTokensRepository: new TypeOrmRefreshTokensRepository(database.dataSource),
{{/if}}
{{#if AUTH}}
    userTokensRepository: new TypeOrmUserTokensRepository(database.dataSource),
{{/if}}
{{/if}}
{{#if MONGOOSE}}
    usersRepository: new MongooseUsersRepository(),
{{#if AUTH_REFRESH}}
    refreshTokensRepository: new MongooseRefreshTokensRepository(),
{{/if}}
{{#if AUTH}}
    userTokensRepository: new MongooseUserTokensRepository(),
{{/if}}
{{/if}}
{{#if AUTH}}
{{#if HASH_ARGON2}}
    passwordHasher: createPasswordHasher(),
{{else}}
    passwordHasher: createPasswordHasher(config.password),
{{/if}}
    tokenService: new JwtTokenService(config.jwt),
    mailer: new LogMailer(logger, config.isProduction),
{{/if}}
    healthChecks: [database.healthCheck],
  };
}
{{#if AUTH}}

export function authSettings(): AuthSettings {
  return {
    appUrl: config.appUrl,
    passwordResetTtl: config.tokens.passwordResetTtl,
    emailVerificationTtl: config.tokens.emailVerificationTtl,
    password: { minLength: config.password.minLength, maxLength: config.password.maxLength },
{{#if SEC_LOCKOUT}}
    lockout: config.lockout,
{{/if}}
  };
}
{{/if}}

/**
 * Composition root: the only place that knows every implementation. Builds each
 * {{#if MODULE_FACTORIES}}module{{else}}{{#if STYLE_SERVICE}}service{{else}}use-case{{/if}}{{/if}} once and hands it to the HTTP layer.
 */
export function createContainer(infra: Infrastructure) {
{{#if MODULE_FACTORIES}}
{{#if AUTH}}
  const auth = createAuthModule({ ...infra, settings: authSettings(), logger });
  const users = createUsersModule({ usersRepository: infra.usersRepository, authenticate: auth.authenticate });
{{else}}
  const users = createUsersModule({ usersRepository: infra.usersRepository });
{{/if}}
  const health = createHealthModule({ healthChecks: infra.healthChecks });
  return { {{#if AUTH}}auth, {{/if}}users, health };
{{/if}}
{{#if !MODULE_FACTORIES}}
{{#if STYLE_SERVICE}}
  return {
{{#if AUTH}}
    auth: new AuthService(
      infra.usersRepository,
{{#if AUTH_REFRESH}}
      infra.refreshTokensRepository,
{{/if}}
      infra.userTokensRepository,
      infra.passwordHasher,
      infra.tokenService,
      infra.mailer,
      authSettings(),
      logger,
    ),
{{/if}}
    users: new UsersService(infra.usersRepository),
    health: new HealthService(infra.healthChecks),
  };
{{/if}}
{{#if STYLE_USECASE}}
  const users = infra.usersRepository;
{{#if AUTH}}
  const settings = authSettings();
  const sessions = new SessionManager(users, {{#if AUTH_REFRESH}}infra.refreshTokensRepository, {{/if}}infra.tokenService);
  const oneTimeTokens = new OneTimeTokens(infra.userTokensRepository, infra.mailer, settings, logger);
{{/if}}

  return {
{{#if AUTH}}
    auth: {
      authenticate: new AuthenticateUseCase(users, infra.tokenService),
      register: new RegisterUseCase(users, infra.passwordHasher, sessions, oneTimeTokens, settings, logger),
      login: new LoginUseCase(users, infra.passwordHasher, sessions, {{#if SEC_LOCKOUT}}settings, {{/if}}logger),
{{#if AUTH_REFRESH}}
      refresh: new RefreshSessionUseCase(users, infra.refreshTokensRepository, infra.tokenService, sessions{{#if AUTH_ROTATION}}, logger{{/if}}),
      logout: new LogoutUseCase(infra.refreshTokensRepository, infra.tokenService),
      logoutAll: new LogoutAllUseCase(users, sessions),
{{else}}
      logout: new LogoutUseCase(users, sessions),
{{/if}}
      getCurrentUser: new GetCurrentUserUseCase(users),
      changePassword: new ChangePasswordUseCase(users, infra.passwordHasher, sessions, settings, logger),
      requestPasswordReset: new RequestPasswordResetUseCase(users, oneTimeTokens),
      resetPassword: new ResetPasswordUseCase(users, infra.passwordHasher, oneTimeTokens, sessions, settings, logger),
      requestEmailVerification: new RequestEmailVerificationUseCase(users, oneTimeTokens),
      verifyEmail: new VerifyEmailUseCase(users, oneTimeTokens),
    },
{{/if}}
    users: {
      list: new ListUsersUseCase(users),
      getById: new GetUserUseCase(users),
{{#if NO_AUTH}}
      create: new CreateUserUseCase(users),
{{/if}}
      update: new UpdateUserUseCase(users),
{{#if AUTH}}
      updateProfile: new UpdateProfileUseCase(users),
{{/if}}
      delete: new DeleteUserUseCase(users),
    },
    health: { check: new CheckHealthUseCase(infra.healthChecks) },
  };
{{/if}}
{{/if}}
}

export type Container = ReturnType<typeof createContainer>;
