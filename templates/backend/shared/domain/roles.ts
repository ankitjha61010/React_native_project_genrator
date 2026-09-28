/**
 * Roles & permissions – the single source of truth for authorization.
 *
 * Routes require either a role (`admin`) or, preferably, a permission (`users:read`).
 * Add permissions here and grant them to roles in ROLE_PERMISSIONS.
 */
export const ROLES = ['user', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = 'user';

export const PERMISSIONS = ['users:read', 'users:write', 'users:delete'{{#if NOTIFICATIONS}}, 'notifications:broadcast'{{/if}}] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  user: [],
  admin: PERMISSIONS,
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
