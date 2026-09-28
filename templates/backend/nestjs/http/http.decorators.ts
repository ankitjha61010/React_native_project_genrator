{{#if AUTH}}
import { applyDecorators, createParamDecorator, SetMetadata{{#if SEC_AUTH_RATE_LIMIT}}{{#if !SEC_RATE_LIMIT}}, UseGuards{{/if}}{{/if}}, type ExecutionContext } from '@nestjs/common';
{{#if SEC_AUTH_RATE_LIMIT}}
import { Throttle{{#if !SEC_RATE_LIMIT}}, ThrottlerGuard{{/if}} } from '@nestjs/throttler';
{{/if}}
import type { Request } from 'express';
{{#if SEC_AUTH_RATE_LIMIT}}
import { config } from '{{IMPORT:config.env}}';
{{/if}}
import { UnauthorizedError } from '{{IMPORT:core.errors}}';
import type { Permission, Role } from '{{IMPORT:domain.roles}}';
import type { User } from '{{IMPORT:domain.user}}';
import type { ClientContext } from '{{IMPORT:app.authTypes}}';
{{else}}
import { SetMetadata } from '@nestjs/common';
{{/if}}

export const RESPONSE_MESSAGE = 'response:message';

/** Message of the success envelope. */
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE, message);
{{#if AUTH}}

export const IS_PUBLIC = 'auth:public';
export const ROLES = 'auth:roles';
export const PERMISSIONS = 'auth:permissions';

/** Opts a route out of the global JWT guard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Requires one of the roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

/** Requires every permission (granted to roles in roles.ts) – prefer this over roles. */
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS, permissions);

export type AuthenticatedRequest = Request & { user?: User };

/** The authenticated user (set by JwtAuthGuard). */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): User => {
  const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw new UnauthorizedError();
  return user;
});

/** IP + user agent of the caller (stored with refresh tokens, used in security logs). */
export const Client = createParamDecorator((_data: unknown, context: ExecutionContext): ClientContext => {
  const req = context.switchToHttp().getRequest<Request>();
  return { ip: req.ip, userAgent: req.get('user-agent') };
});
{{#if SEC_AUTH_RATE_LIMIT}}

/** Stricter rate limit for credential / code endpoints (AUTH_RATE_LIMIT_*). */
export const AuthRateLimit = () =>
  applyDecorators(
{{#if !SEC_RATE_LIMIT}}
    UseGuards(ThrottlerGuard),
{{/if}}
    Throttle({ default: { limit: config.authRateLimit.max, ttl: config.authRateLimit.windowMs } }),
  );
{{else}}

/** Auth rate limiting is turned off – kept as a no-op so routes read the same. */
export const AuthRateLimit = () => applyDecorators();
{{/if}}
{{/if}}
