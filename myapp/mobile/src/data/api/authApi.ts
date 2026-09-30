import type { AuthSession, LoginCredentials, RegisterInput } from '@business/models/auth';
import type { SocialAuthResult } from '@features/auth/services/socialAuthService';
import { forgetFcmToken, getDeviceId, getSignInDevice } from '@infrastructure/notification/deviceInfo';
import { authSessionStorage } from '@data/storage/sessionStorage';
import { api } from './apiClient';
import { toUser, type ServerUser } from './userApi';

/** The backend's session (see its docs/API.md). */
interface ServerSession {
  user: ServerUser;
  tokens: { accessToken: string; refreshToken?: string };
  isNewUser?: boolean;
}

/** A session, plus whether this sign-in created the account (show onboarding). */
export type SignInResult = AuthSession & { isNewUser: boolean };

const toSession = (s: ServerSession): SignInResult => ({
  token: s.tokens.accessToken,
  refreshToken: s.tokens.refreshToken,
  user: toUser(s.user),
  isNewUser: s.isNewUser ?? false,
});

/** Codes sent by email / SMS. */
export interface SentCode {
  expiresIn: number;
  /** Seconds until "resend" may be pressed. */
  resendIn: number;
}

/** No token refresh for the sign-in calls themselves (a 401 there means wrong credentials). */
const noRefresh = { skipAuthRefresh: true };

/**
 * Every sign-in / refresh body carries this install (id, type, model, versions, FCM token):
 * the backend saves the device while signing in – there is no separate device request.
 */
const withDevice = async <T extends object>(body: T) => ({ ...body, device: await getSignInDevice() });

/** Sign-in, sign-out and session requests (profile requests: userApi.ts). */
export const authApi = {
  login: async (credentials: LoginCredentials) =>
    toSession(await api.post<ServerSession>('/auth/login', await withDevice({ email: credentials.email.trim().toLowerCase(), password: credentials.password }), noRefresh)),

  register: async (input: RegisterInput) => toSession(await api.post<ServerSession>('/auth/register', await withDevice(input), noRefresh)),

  forgotPassword: (email: string) => api.post<null>('/auth/forgot-password', { email: email.trim().toLowerCase() }, noRefresh),

  resetPassword: (input: { email: string; code: string; newPassword: string }) => api.post<null>('/auth/reset-password', input, noRefresh),

  /** Returns a new session – the backend signs out the other devices. */
  changePassword: async (input: { currentPassword: string; newPassword: string }) => toSession(await api.post<ServerSession>('/auth/change-password', input)),

  /** Sends the provider's token; the backend verifies it with Google / Facebook / Apple. */
  socialLogin: async (result: SocialAuthResult) =>
    toSession(
      await api.post<ServerSession>(
        '/auth/social',
        await withDevice({
          provider: result.provider,
          token: result.token,
          tokenType: result.tokenType,
          authorizationCode: result.authorizationCode,
          nonce: result.nonce,
          // Apple only gives the name to the app, on the first sign-in.
          name: result.user.name || undefined,
        }),
        noRefresh,
      ),
    ),

  /** New access (+ refresh) token – called by the API client on a 401. */
  refresh: async (refreshToken: string) => toSession(await api.post<ServerSession>('/auth/refresh', await withDevice({ refreshToken }), noRefresh)),

  /** Ends this device's session and removes the device (`deviceId`) – never throws: logging out must always work locally. */
  logout: (refreshToken?: string, deviceId?: string) =>
    api.post<null>('/auth/logout', { ...(refreshToken ? { refreshToken } : {}), ...(deviceId ? { deviceId } : {}) }, noRefresh).catch(() => null),

  me: async () => toUser(await api.get<ServerUser>('/auth/me')),
};

/**
 * The server side of logging out: ends this device's session and stops its pushes.
 * Never throws – signing out must always work, even offline.
 */
export async function endServerSession(): Promise<void> {
  const refreshToken = await authSessionStorage.getRefreshToken();
  // One request: the backend ends the session and removes this device (no more pushes).
  await authApi.logout(refreshToken ?? undefined, await getDeviceId());
  await forgetFcmToken();
}
