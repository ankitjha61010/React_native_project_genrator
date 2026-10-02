import type { User, UserRole } from '{{IMPORT:auth.types}}';
import { forDevice } from '{{IMPORT:config.env}}';
import { api{{#if CHAT}}, type Page{{/if}} } from './apiClient';

/** The backend's user (see the backend's docs/API.md). */
export interface ServerUser {
  id: string;
  email: string | null;
  name: string;
  avatar: string | null;
  countryCode: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  /** False for accounts created with a mobile number or a social login. */
  hasPassword?: boolean;
}

export const toUser = (u: ServerUser): User => ({
  id: u.id,
  email: u.email ?? '',
  name: u.name,
  avatar: u.avatar ? forDevice(u.avatar) : undefined,
  countryCode: u.countryCode ?? undefined,
  phone: u.phone ?? undefined,
  location: u.location ?? undefined,
  bio: u.bio ?? undefined,
  role: u.role,
  emailVerified: u.emailVerified,
  phoneVerified: u.phoneVerified,
  hasPassword: u.hasPassword ?? true,
});

/** Fields the Edit Profile screen changes (`null` removes a value). */
export interface ProfileChanges {
  name?: string;
  countryCode?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
}

/** A picked image / file on the device. */
export interface LocalFile {
  uri: string;
  fileName?: string;
  mimeType?: string;
}

/** Someone the user can chat with (GET /users/search). */
export interface UserSummary {
  id: string;
  name: string;
  avatar: string | null;
}

/** Requests about users: your own profile{{#if CHAT}} and the people you can chat with{{/if}}. */
export const userApi = {
  /** PATCH /users/me – returns the whole updated user. */
  updateProfile: async (changes: ProfileChanges) => toUser(await api.patch<ServerUser>('/users/me', changes)),

  /** POST /users/me/avatar (multipart) – returns the whole updated user. */
  uploadAvatar: async (image: LocalFile) =>
    toUser(await api.upload<ServerUser>('/users/me/avatar', 'avatar', { uri: image.uri, name: image.fileName ?? 'avatar.jpg', type: image.mimeType ?? 'image/jpeg' })),
{{#if DELETE_ACCOUNT}}

  /** DELETE /users/me – deletes the account and its data for good. */
  deleteAccount: () => api.delete<null>('/users/me'),
{{/if}}
{{#if CHAT}}

  /** Other users A → Z; `search` filters by name / email (empty: everybody). */
  search: async (params: { search?: string; page: number; limit?: number }): Promise<Page<UserSummary>> => {
    const res = await api.page<UserSummary>('/users/search', { params: { limit: 20, ...params, search: params.search?.trim() || undefined } });
    return { ...res, items: res.items.map(u => ({ ...u, avatar: u.avatar ? forDevice(u.avatar) : null })) };
  },
{{/if}}
};
