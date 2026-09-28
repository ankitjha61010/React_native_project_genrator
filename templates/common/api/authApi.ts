import type { AuthSession, LoginCredentials, {{#if AUTH_EMAIL}}RegisterInput, {{/if}}{{#if AUTH_MOBILE}}PhoneNumber, {{/if}}User } from '{{IMPORT:auth.types}}';
{{#if HAS_SOCIAL_AUTH}}
import type { SocialAuthResult } from '{{IMPORT:auth.socialAuth}}';
{{/if}}
{{#if NOTIFICATIONS}}
import { getFcmToken } from '{{IMPORT:notification.token}}';
import { notificationsApi } from '{{IMPORT:notification.api}}';
{{/if}}
import { authSessionStorage } from '{{IMPORT:storage.session}}';
import { api } from './apiClient';

/** The backend's user / session shapes (see the backend's docs/API.md). */
interface ServerUser {
  id: string;
  email: string | null;
  name: string;
  avatar: string | null;
  countryCode: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  role: 'user' | 'admin';
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface ServerSession {
  user: ServerUser;
  tokens: { accessToken: string; refreshToken?: string };
  isNewUser?: boolean;
}

export const toUser = (u: ServerUser): User => ({
  id: u.id,
  email: u.email ?? '',
  name: u.name,
  avatar: u.avatar ?? undefined,
  countryCode: u.countryCode ?? undefined,
  phone: u.phone ?? undefined,
  location: u.location ?? undefined,
  bio: u.bio ?? undefined,
  role: u.role,
  emailVerified: u.emailVerified,
  phoneVerified: u.phoneVerified,
});

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

/** Every account-related request of the app. */
export const authApi = {
  login: async (credentials: LoginCredentials) =>
    toSession(await api.post<ServerSession>('/auth/login', { email: credentials.email.trim().toLowerCase(), password: credentials.password }, noRefresh)),
{{#if AUTH_EMAIL}}

  register: async (input: RegisterInput) => toSession(await api.post<ServerSession>('/auth/register', input, noRefresh)),

  forgotPassword: (email: string) => api.post<null>('/auth/forgot-password', { email: email.trim().toLowerCase() }, noRefresh),

  resetPassword: (input: { email: string; code: string; newPassword: string }) => api.post<null>('/auth/reset-password', input, noRefresh),

  changePassword: async (input: { currentPassword?: string; newPassword: string }) => toSession(await api.post<ServerSession>('/auth/change-password', input)),
{{/if}}
{{#if AUTH_MOBILE}}

  sendOtp: (phone: PhoneNumber) => api.post<SentCode>('/auth/otp/send', phone, noRefresh),

  verifyOtp: async (input: PhoneNumber & { otp: string; name?: string }) => toSession(await api.post<ServerSession>('/auth/otp/verify', input, noRefresh)),
{{/if}}
{{#if HAS_SOCIAL_AUTH}}

  /** Sends the provider's token; the backend verifies it with Google / Facebook / Apple. */
  socialLogin: async (result: SocialAuthResult) =>
    toSession(
      await api.post<ServerSession>(
        '/auth/social',
        {
          provider: result.provider,
          token: result.token,
          tokenType: result.tokenType,
          authorizationCode: result.authorizationCode,
          nonce: result.nonce,
          // Apple only gives the name to the app, on the first sign-in.
          name: result.user.name || undefined,
        },
        noRefresh,
      ),
    ),
{{/if}}

  /** New access (+ refresh) token – called by the API client on a 401. */
  refresh: async (refreshToken: string) => toSession(await api.post<ServerSession>('/auth/refresh', { refreshToken }, noRefresh)),

  /** Ends this device's session (never throws – logging out must always work locally). */
  logout: (refreshToken?: string) =>
    api.post<null>('/auth/logout', refreshToken ? { refreshToken } : undefined, noRefresh).catch(() => null),

  me: async () => toUser(await api.get<ServerUser>('/auth/me')),

  updateProfile: async (changes: { name?: string; countryCode?: string | null; phone?: string | null; location?: string | null; bio?: string | null }) =>
    toUser(await api.patch<ServerUser>('/users/me', changes)),

  /** `uri` from the image picker. */
  uploadAvatar: async (image: { uri: string; fileName?: string; mimeType?: string }) =>
    toUser(await api.upload<ServerUser>('/users/me/avatar', 'avatar', { uri: image.uri, name: image.fileName ?? 'avatar.jpg', type: image.mimeType ?? 'image/jpeg' })),

  deleteAccount: () => api.delete<null>('/users/me'),
};

/**
 * The server side of logging out: ends this device's session{{#if NOTIFICATIONS}} and stops its pushes{{/if}}.
 * Never throws – signing out must always work, even offline.
 */
export async function endServerSession(): Promise<void> {
{{#if NOTIFICATIONS}}
  const fcmToken = await getFcmToken();
  if (fcmToken) await notificationsApi.unregisterDevice(fcmToken).catch(() => null);
{{/if}}
  const refreshToken = await authSessionStorage.getRefreshToken();
  await authApi.logout(refreshToken ?? undefined);
}
