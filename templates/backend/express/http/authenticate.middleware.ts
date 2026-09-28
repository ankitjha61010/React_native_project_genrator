import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { UnauthorizedError } from '{{IMPORT:core.errors}}';
import type { User } from '{{IMPORT:domain.user}}';

/** Resolves the user behind an access token (AuthService.authenticate / AuthenticateUseCase). */
export type Authenticator = (accessToken: string) => Promise<User>;

function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

/** Requires a valid `Authorization: Bearer <access token>` and sets `req.user`. */
export function createAuthenticate(authenticate: Authenticator): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = bearerToken(req);
    if (!token) throw new UnauthorizedError('Missing bearer token', 'MISSING_TOKEN');
    req.user = await authenticate(token);
    next();
  };
}

/** The authenticated user (use after `authenticate`). */
export function currentUser(req: Request): User {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}
