import { authRepository } from '@data/repositories/authRepository';
import type { AuthSession, LoginCredentials } from '@business/models/auth';
import type { SocialAuthResult } from '@features/auth/services/socialAuthService';

/** Business layer: rules around authentication. Talks to the data layer only. */
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const normalized = { ...credentials, email: credentials.email.trim().toLowerCase() };
    return authRepository.login(normalized);
  },

  /** Exchanges a verified provider credential for an app session (see docs/SOCIAL_LOGIN.md). */
  async socialLogin(result: SocialAuthResult): Promise<AuthSession> {
    return authRepository.socialLogin(result);
  },

  register: authRepository.register,
  forgotPassword: authRepository.forgotPassword,
  resetPassword: authRepository.resetPassword,
  me: authRepository.me,
  logout: authRepository.logout,
};
