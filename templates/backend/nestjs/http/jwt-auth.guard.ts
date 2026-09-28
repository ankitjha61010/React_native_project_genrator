import { {{#if STYLE_USECASE}}Inject, {{/if}}Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UnauthorizedError } from '{{IMPORT:core.errors}}';
{{#if STYLE_SERVICE}}
import { AuthService } from '{{IMPORT:app.authService}}';
{{else}}
import type { AuthUseCases } from '{{IMPORT:nest.auth.providers}}';
import { AUTH_USE_CASES } from '{{IMPORT:nest.tokens}}';
{{/if}}
import { IS_PUBLIC, type AuthenticatedRequest } from '{{IMPORT:nest.decorators}}';

/**
 * Global guard: every route needs `Authorization: Bearer <access token>` unless marked
 * `@Public()`. Sets `request.user`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
{{#if STYLE_SERVICE}}
    private readonly auth: AuthService,
{{else}}
    @Inject(AUTH_USE_CASES) private readonly auth: AuthUseCases,
{{/if}}
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) throw new UnauthorizedError('Missing bearer token', 'MISSING_TOKEN');
    req.user = await this.auth.authenticate{{CALL}}(token);
    return true;
  }
}
