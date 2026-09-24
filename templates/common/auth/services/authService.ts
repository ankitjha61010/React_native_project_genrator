import type { AuthSession, LoginCredentials } from '{{IMPORT:auth.types}}';

const DEMO_LATENCY_MS = 800;

export const authService = {
  /**
   * DEMO implementation: accepts any valid credentials and returns a fake session.
   * Replace with a real request, e.g.
   *
   *   import { api } from '{{IMPORT:api.client}}';
   *   return api.post<AuthSession>('/auth/login', credentials);
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    await new Promise<void>(resolve => setTimeout(() => resolve(), DEMO_LATENCY_MS));
    const email = credentials.email.trim().toLowerCase();
    return {
      token: 'demo-token',
      user: { id: 'demo-user', email, name: email.split('@')[0] ?? email },
    };
  },
};
