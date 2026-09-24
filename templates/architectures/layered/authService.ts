import { authRepository } from '{{IMPORT:data.authRepository}}';
import type { AuthSession, LoginCredentials } from '{{IMPORT:auth.types}}';

/** Business layer: rules around authentication. Talks to the data layer only. */
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const normalized = { ...credentials, email: credentials.email.trim().toLowerCase() };
    return authRepository.login(normalized);
  },
};
