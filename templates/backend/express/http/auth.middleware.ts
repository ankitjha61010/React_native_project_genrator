import type { Request, RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '{{IMPORT:core.errors}}';
import { hasPermission, type Permission } from '{{IMPORT:domain.roles}}';
import type { User } from '{{IMPORT:domain.user}}';
import type { Sessions } from '{{IMPORT:app.authSessions}}';
import { AUTH_MESSAGES } from '{{IMPORT:messages.auth}}';

// Lets routes read `req.user` with its type.
declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAuth`. */
      user?: User;
    }
  }
}

/**
 * Requires `Authorization: Bearer <access token>` and puts the user on `req.user`:
 *
 *   router.use(requireAuth(services.sessions));             // every route of a router
 *   router.get('/me', requireAuth(services.sessions), …);   // one route
 */
export function requireAuth(sessions: Sessions): RequestHandler {
  return async (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) throw new UnauthorizedError(AUTH_MESSAGES.missingToken);
    req.user = await sessions.authenticate(token);
    next();
  };
}

/** Requires a permission of the signed-in user's role (see roles.ts). Use after `requireAuth`. */
export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    if (!hasPermission(currentUser(req).role, permission)) throw new ForbiddenError();
    next();
  };
}

/** The signed-in user (in routes behind `requireAuth`). */
export function currentUser(req: Request): User {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}
