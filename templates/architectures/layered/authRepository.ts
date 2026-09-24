import type { AuthSession, LoginCredentials } from '{{IMPORT:auth.types}}';

const DEMO_LATENCY_MS = 800;

/**
 * Data layer: knows WHERE data comes from (API, cache…), nothing about business rules.
 *
 * DEMO implementation. Replace with:
 *   import { api } from '{{IMPORT:api.client}}';
 *   return api.post<AuthSession>('/auth/login', credentials);
 */
export const authRepository = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    await new Promise<void>(resolve => setTimeout(() => resolve(), DEMO_LATENCY_MS));
    return {
      token: 'demo-token',
      user: { id: 'demo-user', email: credentials.email, name: credentials.email.split('@')[0] ?? credentials.email },
    };
  },
};
