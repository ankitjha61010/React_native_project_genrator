{{#if AUTH}}
import type { Role } from '{{IMPORT:domain.roles}}';

{{/if}}
/** A user as the application sees it (independent of the database). */
export interface User {
  id: string;
  email: string;
  name: string;
{{#if AUTH}}
  passwordHash: string;
  role: Role;
  emailVerifiedAt: Date | null;
  isActive: boolean;
  /** Bumped to invalidate every token issued before (logout everywhere, password change). */
  tokenVersion: number;
  lastLoginAt: Date | null;
{{#if SEC_LOCKOUT}}
  failedLoginAttempts: number;
  lockedUntil: Date | null;
{{/if}}
{{/if}}
  createdAt: Date;
  updatedAt: Date;
}

/** What may leave the server – never password hashes or security counters. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
{{#if AUTH}}
  role: Role;
  emailVerified: boolean;
{{/if}}
  createdAt: string;
  updatedAt: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
{{#if AUTH}}
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
{{/if}}
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/** Emails are compared case-insensitively. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
