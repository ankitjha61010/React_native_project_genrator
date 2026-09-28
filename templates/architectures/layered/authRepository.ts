import { authApi } from '{{IMPORT:api.auth}}';

/**
 * Data layer: knows WHERE data comes from (the backend API), nothing about business rules.
 */
export const authRepository = {
  login: authApi.login,
{{#if AUTH_EMAIL}}
  register: authApi.register,
  forgotPassword: authApi.forgotPassword,
  resetPassword: authApi.resetPassword,
{{/if}}
{{#if AUTH_MOBILE}}
  sendOtp: authApi.sendOtp,
  verifyOtp: authApi.verifyOtp,
{{/if}}
{{#if HAS_SOCIAL_AUTH}}
  socialLogin: authApi.socialLogin,
{{/if}}
  me: authApi.me,
  logout: authApi.logout,
};
