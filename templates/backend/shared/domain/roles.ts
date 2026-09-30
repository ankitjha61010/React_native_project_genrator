/**
 * Roles & permissions – the single source of truth for authorization.
 *
 * `UserRole` is stored as a database enum (users.role) and sent to the app as-is. Routes
 * require either a role (`UserRole.ADMIN`) or, preferably, a permission (`users:read`).
 * Add permissions here and grant them to roles in ROLE_PERMISSIONS.
 */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export const ROLES: readonly UserRole[] = Object.values(UserRole);

export const DEFAULT_ROLE = UserRole.USER;

export const PERMISSIONS = ['users:read', 'users:write', 'users:delete'{{#if NOTIFICATIONS}}, 'notifications:broadcast'{{/if}}] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.USER]: [],
  [UserRole.ADMIN]: PERMISSIONS,
};

export function isRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
