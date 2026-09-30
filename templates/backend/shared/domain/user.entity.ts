{{#if AUTH}}
import type { UserRole } from '{{IMPORT:domain.roles}}';

/** A user as the application sees it (independent of the database). */
export interface User {
  id: string;
  /** Null for accounts created with a mobile number (or a social account without email). */
  email: string | null;
  name: string;
  /** Null for accounts without a password (mobile / social sign-in). */
  passwordHash: string | null;
  role: UserRole;
  emailVerifiedAt: Date | null;
  /** Dial code, e.g. "+91". */
  countryCode: string | null;
  /** National number, digits only, e.g. "9876543210". */
  phone: string | null;
  phoneVerifiedAt: Date | null;
  avatarUrl: string | null;
  location: string | null;
  bio: string | null;
  isActive: boolean;
  /** Bumped to invalidate every token issued before (logout everywhere, password change). */
  tokenVersion: number;
  lastLoginAt: Date | null;
  lastSeenAt: Date | null;
{{#if SEC_LOCKOUT}}
  failedLoginAttempts: number;
  lockedUntil: Date | null;
{{/if}}
  createdAt: Date;
  updatedAt: Date;
}

/** What may leave the server – never password hashes or security counters. */
export interface PublicUser {
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
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The little other users may see (chat participants, user search). */
export interface UserSummary {
  id: string;
  name: string;
  avatar: string | null;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatarUrl,
    countryCode: user.countryCode,
    phone: user.phone,
    location: user.location,
    bio: user.bio,
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
    phoneVerified: user.phoneVerifiedAt !== null,
    hasPassword: user.passwordHash !== null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toUserSummary(user: User): UserSummary {
  return { id: user.id, name: user.name, avatar: user.avatarUrl };
}

/** "+91" / "91" → "+91"; "98765 43210" → "9876543210". */
export function normalizePhone(countryCode: string, phone: string): { countryCode: string; phone: string } {
  return { countryCode: `+${countryCode.replace(/\D/g, '')}`, phone: phone.replace(/\D/g, '').replace(/^0+/, '') };
}
{{else}}
/** A user as the application sees it (independent of the database). */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
{{/if}}

/** Emails are compared case-insensitively. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
