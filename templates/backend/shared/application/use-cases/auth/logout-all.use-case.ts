import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { SessionManager } from '{{IMPORT:uc.support}}';

/** Signs the user out on every device (all access and refresh tokens). */
export class LogoutAllUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly sessions: SessionManager,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (user) await this.sessions.revokeAll(user);
  }
}
