export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  email: string | null;
  name: string;
  role: UserRole;
  /** Mirrors PublicUser.isActive – true when account is enabled. */
  isActive?: boolean;
  avatar: string | null;
  countryCode: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasPassword: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  type: string;
  audience: 'all' | 'users' | 'admins';
  recipientCount: number;
  createdAt: string;
}

/** Matches the backend's OTA release (GET /ota/releases). */
export interface OTARelease {
  id: string;
  version: number;
  nativeVersion: string;
  platform: 'android' | 'ios' | 'all';
  bundleUrl: string;
  bundleSize: number;
  sha256: string;
  signature: string;
  forceUpdate: boolean;
  releaseNotes?: string | null;
  targetRolloutPct: number;
  status: 'active' | 'rolled_back' | 'draft';
  downloadCount: number;
  createdAt: string;
}

export interface LegalLinks {
  termsUrl: string;
  privacyPolicyUrl: string;
  deleteAccountUrl?: string;
}

/** Matches the backend SessionView shape returned from every sign-in endpoint. */
export interface AuthResponse {
  user: User;
  tokens: {
    tokenType: 'Bearer';
    accessToken: string;
    expiresIn: number;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
  };
  isNewUser?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}
