import { authApi } from '{{IMPORT:api.auth}}';
import type { AuthRepository } from '{{IMPORT:domain.authRepository}}';

/** Data layer implementation of the domain AuthRepository: the backend API (api/authApi.ts). */
export class AuthRepositoryImpl implements AuthRepository {
  login = authApi.login;
{{#if AUTH_EMAIL}}
  register = authApi.register;
  forgotPassword = authApi.forgotPassword;
  resetPassword = authApi.resetPassword;
{{/if}}
{{#if AUTH_MOBILE}}
  sendOtp = authApi.sendOtp;
  verifyOtp = authApi.verifyOtp;
{{/if}}
{{#if HAS_SOCIAL_AUTH}}
  /** The backend verifies the provider token (Google / Facebook / Apple). */
  socialLogin = authApi.socialLogin;
{{/if}}
  me = authApi.me;
  logout = authApi.logout;
}

export const authRepository: AuthRepository = new AuthRepositoryImpl();
