{{#if AUTH}}
import { config } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:core.logger}}';
import { createPasswordHasher } from '{{IMPORT:impl.passwordHasher}}';
import { JwtTokenService } from '{{IMPORT:impl.tokenService}}';
import type { AuthSettings } from '{{IMPORT:app.authTypes}}';
{{/if}}
{{#if STYLE_SERVICE}}
{{#if AUTH}}
import { AuthService } from '{{IMPORT:app.authService}}';
{{/if}}
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
import { RefreshSessionUseCase } from '{{IMPORT:uc.refreshSession}}';
{{/if}}
import { LogoutUseCase } from '{{IMPORT:uc.logout}}';
import { RegisterUseCase } from '{{IMPORT:uc.register}}';
import { RequestEmailVerificationUseCase } from '{{IMPORT:uc.requestEmailVerification}}';
import { RequestPasswordResetUseCase } from '{{IMPORT:uc.requestPasswordReset}}';
import { ResetPasswordUseCase } from '{{IMPORT:uc.resetPassword}}';
import { VerifyEmailUseCase } from '{{IMPORT:uc.verifyEmail}}';
import { UpdateProfileUseCase } from '{{IMPORT:uc.updateProfile}}';
{{else}}
import { CreateUserUseCase } from '{{IMPORT:uc.createUser}}';
{{/if}}
import { DeleteUserUseCase } from '{{IMPORT:uc.deleteUser}}';
import { GetUserUseCase } from '{{IMPORT:uc.getUser}}';
import { ListUsersUseCase } from '{{IMPORT:uc.listUsers}}';
import { UpdateUserUseCase } from '{{IMPORT:uc.updateUser}}';
{{/if}}
{{#if AUTH}}
import { FakeMailer } from './fakes.js';
{{/if}}
import {
{{#if AUTH_REFRESH}}
  InMemoryRefreshTokensRepository,
{{/if}}
{{#if AUTH}}
  InMemoryUserTokensRepository,
{{/if}}
  InMemoryUsersRepository,
} from './in-memory-repositories.js';

/**
 * Builds the application layer on in-memory infrastructure for unit tests.
{{#if STYLE_USECASE}}
 * The use-cases are exposed through one object per feature so tests read naturally.
{{/if}}
 */
export function createHarness() {
  const usersRepository = new InMemoryUsersRepository();
{{#if AUTH}}
{{#if AUTH_REFRESH}}
  const refreshTokensRepository = new InMemoryRefreshTokensRepository();
{{/if}}
  const userTokensRepository = new InMemoryUserTokensRepository();
  const mailer = new FakeMailer();
{{#if HASH_ARGON2}}
  const hasher = createPasswordHasher();
{{else}}
  const hasher = createPasswordHasher(config.password);
{{/if}}
  const tokens = new JwtTokenService(config.jwt);
  const settings: AuthSettings = {
    appUrl: config.appUrl,
    passwordResetTtl: config.tokens.passwordResetTtl,
    emailVerificationTtl: config.tokens.emailVerificationTtl,
    password: { minLength: config.password.minLength, maxLength: config.password.maxLength },
{{#if SEC_LOCKOUT}}
    lockout: config.lockout,
{{/if}}
  };
{{/if}}

{{#if STYLE_SERVICE}}
{{#if AUTH}}
  const auth = new AuthService(usersRepository, {{#if AUTH_REFRESH}}refreshTokensRepository, {{/if}}userTokensRepository, hasher, tokens, mailer, settings, logger);
{{/if}}
  const users = new UsersService(usersRepository);
{{else}}
{{#if AUTH}}
  const sessions = new SessionManager(usersRepository, {{#if AUTH_REFRESH}}refreshTokensRepository, {{/if}}tokens);
  const oneTimeTokens = new OneTimeTokens(userTokensRepository, mailer, settings, logger);
  const useCases = {
    register: new RegisterUseCase(usersRepository, hasher, sessions, oneTimeTokens, settings, logger),
    login: new LoginUseCase(usersRepository, hasher, sessions, {{#if SEC_LOCKOUT}}settings, {{/if}}logger),
{{#if AUTH_REFRESH}}
    refresh: new RefreshSessionUseCase(usersRepository, refreshTokensRepository, tokens, sessions{{#if AUTH_ROTATION}}, logger{{/if}}),
    logout: new LogoutUseCase(refreshTokensRepository, tokens),
    logoutAll: new LogoutAllUseCase(usersRepository, sessions),
{{else}}
    logout: new LogoutUseCase(usersRepository, sessions),
{{/if}}
    authenticate: new AuthenticateUseCase(usersRepository, tokens),
    getCurrentUser: new GetCurrentUserUseCase(usersRepository),
    changePassword: new ChangePasswordUseCase(usersRepository, hasher, sessions, settings, logger),
    requestPasswordReset: new RequestPasswordResetUseCase(usersRepository, oneTimeTokens),
    resetPassword: new ResetPasswordUseCase(usersRepository, hasher, oneTimeTokens, sessions, settings, logger),
    requestEmailVerification: new RequestEmailVerificationUseCase(usersRepository, oneTimeTokens),
    verifyEmail: new VerifyEmailUseCase(usersRepository, oneTimeTokens),
  };
  const auth = {
    register: useCases.register.execute.bind(useCases.register),
    login: useCases.login.execute.bind(useCases.login),
{{#if AUTH_REFRESH}}
    refresh: useCases.refresh.execute.bind(useCases.refresh),
    logoutAll: useCases.logoutAll.execute.bind(useCases.logoutAll),
{{/if}}
    logout: useCases.logout.execute.bind(useCases.logout),
    authenticate: useCases.authenticate.execute.bind(useCases.authenticate),
    getCurrentUser: useCases.getCurrentUser.execute.bind(useCases.getCurrentUser),
    changePassword: useCases.changePassword.execute.bind(useCases.changePassword),
    requestPasswordReset: useCases.requestPasswordReset.execute.bind(useCases.requestPasswordReset),
    resetPassword: useCases.resetPassword.execute.bind(useCases.resetPassword),
    requestEmailVerification: useCases.requestEmailVerification.execute.bind(useCases.requestEmailVerification),
    verifyEmail: useCases.verifyEmail.execute.bind(useCases.verifyEmail),
  };
{{/if}}
  const userUseCases = {
    list: new ListUsersUseCase(usersRepository),
    getById: new GetUserUseCase(usersRepository),
{{#if NO_AUTH}}
    create: new CreateUserUseCase(usersRepository),
{{else}}
    updateProfile: new UpdateProfileUseCase(usersRepository),
{{/if}}
    update: new UpdateUserUseCase(usersRepository),
    delete: new DeleteUserUseCase(usersRepository),
  };
  const users = {
    list: userUseCases.list.execute.bind(userUseCases.list),
    getById: userUseCases.getById.execute.bind(userUseCases.getById),
{{#if NO_AUTH}}
    create: userUseCases.create.execute.bind(userUseCases.create),
{{else}}
    updateProfile: userUseCases.updateProfile.execute.bind(userUseCases.updateProfile),
{{/if}}
    update: userUseCases.update.execute.bind(userUseCases.update),
    delete: userUseCases.delete.execute.bind(userUseCases.delete),
  };
{{/if}}

  return {
{{#if AUTH}}
    auth,
{{/if}}
    users,
    usersRepository,
{{#if AUTH}}
{{#if AUTH_REFRESH}}
    refreshTokensRepository,
{{/if}}
    userTokensRepository,
    mailer,
    hasher,
    tokens,
{{/if}}
  };
}
