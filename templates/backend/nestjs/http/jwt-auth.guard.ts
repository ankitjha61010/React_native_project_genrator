import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UnauthorizedError } from '{{IMPORT:core.errors}}';
import type { Services } from '{{IMPORT:app.container}}';
import { SERVICES } from '{{IMPORT:nest.tokens}}';
import { IS_PUBLIC, type AuthenticatedRequest } from '{{IMPORT:nest.decorators}}';
import { AUTH_MESSAGES } from '{{IMPORT:messages.auth}}';

/**
 * Global guard: every route needs `Authorization: Bearer <access token>` unless marked
 * `@Public()`. Sets `request.user`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(SERVICES) private readonly services: Services,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) throw new UnauthorizedError(AUTH_MESSAGES.missingToken);
    req.user = await this.services.sessions.authenticate(token);
    return true;
  }
}
