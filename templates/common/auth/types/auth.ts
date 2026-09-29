/** The signed-in user (the backend's `User`, see docs/API.md of the backend). */
export interface User {
  id: string;
  /** Empty for accounts created with a mobile number. */
  email: string;
  name: string;
  avatar?: string;
  /** Dial code, e.g. "+91". */
  countryCode?: string;
  phone?: string;
  location?: string;
  bio?: string;
  role?: 'user' | 'admin';
  emailVerified?: boolean;
  phoneVerified?: boolean;
  /** False for accounts without a password (mobile / social sign-in) – no Change Password for them. */
  hasPassword?: boolean;
}

export interface AuthSession {
  /** Access token (`Authorization: Bearer …`). */
  token: string;
  /** Present when the backend uses refresh tokens. */
  refreshToken?: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  countryCode?: string;
  phone?: string;
}

export interface PhoneNumber {
  countryCode: string;
  phone: string;
}
