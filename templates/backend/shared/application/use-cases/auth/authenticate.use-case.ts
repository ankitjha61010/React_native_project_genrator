import { UnauthorizedError } from '{{IMPORT:core.errors}}';
import type { User } from '{{IMPORT:domain.user}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { TokenService } from '{{IMPORT:port.tokenService}}';

/** Resolves the user behind an access token (used by the auth guard / middleware). */
export class AuthenticateUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly tokens: TokenService,
  ) {}

  async execute(accessToken: string): Promise<User> {
    const payload = this.tokens.verifyAccessToken(accessToken);
    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
      throw new UnauthorizedError('Your session is no longer valid, please log in again', 'SESSION_REVOKED');
    }
    return user;
  }
}
