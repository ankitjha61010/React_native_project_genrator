import jwt from 'jsonwebtoken';
import { parseDuration } from '{{IMPORT:core.crypto}}';
import { UnauthorizedError } from '{{IMPORT:core.errors}}';
import { isRole } from '{{IMPORT:domain.roles}}';
{{#if AUTH_REFRESH}}
import type { AccessTokenPayload, RefreshTokenPayload, SignedToken, TokenService } from '{{IMPORT:port.tokenService}}';
{{else}}
import type { AccessTokenPayload, SignedToken, TokenService } from '{{IMPORT:port.tokenService}}';
{{/if}}
import { AUTH_MESSAGES } from '{{IMPORT:messages.auth}}';

export interface JwtOptions {
  accessSecret: string;
  accessExpiresIn: string;
{{#if AUTH_REFRESH}}
  refreshSecret: string;
  refreshExpiresIn: string;
{{/if}}
  issuer: string;
  audience: string;
}

const ALGORITHM = 'HS256';

/** Signs and verifies JWTs (HS256). Access and refresh tokens use different secrets. */
export class JwtTokenService implements TokenService {
  constructor(private readonly options: JwtOptions) {}

  signAccessToken({ sub, role, tv }: AccessTokenPayload): SignedToken {
    return this.sign({ role, tv, typ: 'access' }, this.options.accessSecret, this.options.accessExpiresIn, { subject: sub });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = this.verify(token, this.options.accessSecret, 'access');
    if (!isRole(payload.role) || typeof payload.tv !== 'number') {
      throw new UnauthorizedError(AUTH_MESSAGES.invalidAccessToken);
    }
    return { sub: payload.sub!, role: payload.role, tv: payload.tv };
  }
{{#if AUTH_REFRESH}}

  signRefreshToken({ sub, jti, fam }: RefreshTokenPayload): SignedToken {
    return this.sign({ fam, typ: 'refresh' }, this.options.refreshSecret, this.options.refreshExpiresIn, { subject: sub, jwtid: jti });
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = this.verify(token, this.options.refreshSecret, 'refresh');
    if (typeof payload.jti !== 'string' || typeof payload.fam !== 'string') {
      throw new UnauthorizedError(AUTH_MESSAGES.invalidRefreshToken);
    }
    return { sub: payload.sub!, jti: payload.jti, fam: payload.fam };
  }
{{/if}}

  private sign(claims: Record<string, unknown>, secret: string, lifetime: string, extra: jwt.SignOptions): SignedToken {
    const expiresIn = Math.floor(parseDuration(lifetime) / 1000);
    const token = jwt.sign(claims, secret, {
      ...extra,
      algorithm: ALGORITHM,
      expiresIn,
      issuer: this.options.issuer,
      audience: this.options.audience,
    });
    return { token, expiresIn, expiresAt: new Date(Date.now() + expiresIn * 1000) };
  }

  private verify(token: string, secret: string, type: 'access' | 'refresh'): jwt.JwtPayload {
    let payload: string | jwt.JwtPayload;
    try {
      payload = jwt.verify(token, secret, {
        algorithms: [ALGORITHM],
        issuer: this.options.issuer,
        audience: this.options.audience,
      });
    } catch (error) {
      const expired = error instanceof jwt.TokenExpiredError;
      throw new UnauthorizedError(expired ? AUTH_MESSAGES.tokenExpired : AUTH_MESSAGES.invalidToken);
    }
    if (typeof payload === 'string' || payload.typ !== type || typeof payload.sub !== 'string') {
      throw new UnauthorizedError(AUTH_MESSAGES.invalidToken);
    }
    return payload;
  }
}
