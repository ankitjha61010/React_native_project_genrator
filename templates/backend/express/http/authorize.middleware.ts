import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '{{IMPORT:core.errors}}';
import { hasPermission, type Permission, type Role } from '{{IMPORT:domain.roles}}';

/** Allows the request when the user has one of the roles. */
export function requireRoles(...roles: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) throw new ForbiddenError();
    next();
  };
}

/** Allows the request when the user's role grants every permission (see roles.ts). */
export function requirePermissions(...permissions: Permission[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    const role = req.user.role;
    if (!permissions.every(permission => hasPermission(role, permission))) throw new ForbiddenError();
    next();
  };
}
