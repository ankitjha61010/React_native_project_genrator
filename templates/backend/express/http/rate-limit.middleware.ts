import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from '{{IMPORT:config.env}}';
import { errorResponse } from '{{IMPORT:core.response}}';

function limiter(windowMs: number, limit: number, message: string): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    // `RateLimit` / `RateLimit-Policy` headers (IETF draft 8), no legacy X-RateLimit-*.
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json(errorResponse(message, 'TOO_MANY_REQUESTS'));
    },
  });
}
{{#if SEC_RATE_LIMIT}}

/** Every route (RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW_MS per IP). */
export const globalRateLimit = limiter(config.rateLimit.windowMs, config.rateLimit.max, 'Too many requests, please try again later');
{{/if}}
{{#if SEC_AUTH_RATE_LIMIT}}

/** Login / register / password reset – brute force protection. */
export const authRateLimit = limiter(
  config.authRateLimit.windowMs,
  config.authRateLimit.max,
  'Too many attempts, please try again later',
);
{{/if}}
