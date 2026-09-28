import { authApi } from '{{IMPORT:api.auth}}';

/**
 * Authentication use cases of the app – each one is a request to the backend
 * (see api/authApi.ts). Screens and hooks call this service.
 */
export const authService = {
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
  logout: authApi.logout,
  me: authApi.me,
};
