import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
{{#if REDIS}}
import { RedisStore, type RedisReply } from 'rate-limit-redis';
{{/if}}
import { config } from '{{IMPORT:config.env}}';
import { errorResponse } from '{{IMPORT:core.response}}';
{{#if REDIS}}
import { redis } from '{{IMPORT:db.redis}}';
{{/if}}
import { COMMON_MESSAGES, type ErrorMessage } from '{{IMPORT:core.messages}}';

{{#if REDIS}}
/** Counts requests in Redis, so every server instance shares the same limits (memory without Redis). */
function redisStore(name: string) {
  const client = redis;
  if (!client) return undefined;
  return new RedisStore({ prefix: `rate-limit:${name}:`, sendCommand: (command: string, ...args: string[]) => client.call(command, ...args) as Promise<RedisReply> });
}

function limiter(name: string, windowMs: number, limit: number, message: ErrorMessage): RequestHandler {
{{else}}
function limiter(windowMs: number, limit: number, message: ErrorMessage): RequestHandler {
{{/if}}
  return rateLimit({
    windowMs,
    limit,
    // `RateLimit` / `RateLimit-Policy` headers (IETF draft 8), no legacy X-RateLimit-*.
    standardHeaders: 'draft-8',
    legacyHeaders: false,
{{#if REDIS}}
    store: redisStore(name),
{{/if}}
    handler: (_req, res) => {
      res.status(429).json(errorResponse(message));
    },
  });
}
{{#if SEC_RATE_LIMIT}}

/** Every route (RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW_MS per IP). */
export const globalRateLimit = limiter({{#if REDIS}}'global', {{/if}}config.rateLimit.windowMs, config.rateLimit.max, COMMON_MESSAGES.tooManyRequests);
{{/if}}
{{#if SEC_AUTH_RATE_LIMIT}}

/** Login / register / password reset – brute force protection. */
export const authRateLimit = limiter({{#if REDIS}}'auth', {{/if}}config.authRateLimit.windowMs, config.authRateLimit.max, COMMON_MESSAGES.tooManyAuthAttempts);
{{/if}}
