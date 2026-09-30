import { authApi } from '@data/api/authApi';

/**
 * Data layer: knows WHERE data comes from (the backend API), nothing about business rules.
 */
export const authRepository = {
  login: authApi.login,
  register: authApi.register,
  forgotPassword: authApi.forgotPassword,
  resetPassword: authApi.resetPassword,
  socialLogin: authApi.socialLogin,
  me: authApi.me,
  logout: authApi.logout,
};
