import type { Logger } from '{{IMPORT:core.logger}}';
{{#if AUTH_REFRESH}}
import type { RefreshTokensRepository } from '{{IMPORT:contract.refreshTokens}}';
{{/if}}
import type { UserTokensRepository } from '{{IMPORT:contract.userTokens}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { Mailer } from '{{IMPORT:port.mailer}}';
import type { PasswordHasher } from '{{IMPORT:port.passwordHasher}}';
import type { TokenService } from '{{IMPORT:port.tokenService}}';
import { createAuthenticate } from '{{IMPORT:ex.mw.authenticate}}';
import { AuthController } from '{{IMPORT:ex.auth.controller}}';
import { createAuthRouter } from '{{IMPORT:ex.auth.routes}}';
import { AuthService } from '{{IMPORT:app.authService}}';
import type { AuthSettings } from '{{IMPORT:app.authTypes}}';

export interface AuthModuleDependencies {
  usersRepository: UsersRepository;
{{#if AUTH_REFRESH}}
  refreshTokensRepository: RefreshTokensRepository;
{{/if}}
  userTokensRepository: UserTokensRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
  mailer: Mailer;
  settings: AuthSettings;
  logger: Logger;
}

/**
 * Public API of the auth module: its router, the `authenticate` middleware other
 * modules use, and the service. Everything else in this folder is internal.
 */
export function createAuthModule(deps: AuthModuleDependencies) {
  const service = new AuthService(
    deps.usersRepository,
{{#if AUTH_REFRESH}}
    deps.refreshTokensRepository,
{{/if}}
    deps.userTokensRepository,
    deps.passwordHasher,
    deps.tokenService,
    deps.mailer,
    deps.settings,
    deps.logger,
  );
  const authenticate = createAuthenticate(token => service.authenticate(token));
  return { service, authenticate, router: createAuthRouter(new AuthController(service), authenticate) };
}

export type AuthModule = ReturnType<typeof createAuthModule>;
