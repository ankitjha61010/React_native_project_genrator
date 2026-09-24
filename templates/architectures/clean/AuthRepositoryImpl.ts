import type { AuthSession, LoginCredentials } from '{{IMPORT:auth.types}}';
import type { AuthRepository } from '{{IMPORT:domain.authRepository}}';

const DEMO_LATENCY_MS = 800;

/**
 * Data layer implementation of the domain AuthRepository.
 *
 * DEMO implementation. Replace with:
 *   import { api } from '{{IMPORT:api.client}}';
 *   return api.post<AuthSession>('/auth/login', credentials);
 */
export class AuthRepositoryImpl implements AuthRepository {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    await new Promise<void>(resolve => setTimeout(() => resolve(), DEMO_LATENCY_MS));
    return {
      token: 'demo-token',
      user: { id: 'demo-user', email: credentials.email, name: credentials.email.split('@')[0] ?? credentials.email },
    };
  }
}

export const authRepository: AuthRepository = new AuthRepositoryImpl();
