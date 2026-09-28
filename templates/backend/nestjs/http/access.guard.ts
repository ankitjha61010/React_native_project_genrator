import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenError } from '{{IMPORT:core.errors}}';
import { hasPermission, type Permission, type Role } from '{{IMPORT:domain.roles}}';
import { PERMISSIONS, ROLES, type AuthenticatedRequest } from '{{IMPORT:nest.decorators}}';

/** Global guard (after JwtAuthGuard): enforces `@Roles()` and `@RequirePermissions()`. */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    const permissions = this.reflector.getAllAndOverride<Permission[] | undefined>(PERMISSIONS, targets);
    if (!roles?.length && !permissions?.length) return true;

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) throw new ForbiddenError();
    if (roles?.length && !roles.includes(user.role)) throw new ForbiddenError();
    if (permissions?.length && !permissions.every(permission => hasPermission(user.role, permission))) throw new ForbiddenError();
    return true;
  }
}
