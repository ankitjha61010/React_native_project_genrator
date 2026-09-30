{{#if SEC_CORS}}
import cors from 'cors';
{{/if}}
import express, { type Express } from 'express';
{{#if SEC_HELMET}}
import helmet from 'helmet';
{{/if}}
import { config } from '{{IMPORT:config.env}}';
{{#if SEC_SANITIZE}}
import { sanitizeInput } from '{{IMPORT:ex.mw.sanitize}}';
{{/if}}

/**
 * HTTP hardening, applied before any route:
{{#if SEC_HELMET}}
 * - security headers (helmet)
{{/if}}
{{#if SEC_CORS}}
 * - CORS allow-list (CORS_ORIGINS); requests without an Origin (mobile apps, curl) are allowed
{{/if}}
{{#if SEC_BODY_LIMIT}}
 * - request body size limit (BODY_LIMIT)
{{/if}}
{{#if SEC_SANITIZE}}
 * - input sanitization (operator / prototype keys removed)
{{/if}}
 */
export function applySecurity(app: Express): void {
  app.disable('x-powered-by');
  if (config.http.trustProxy) app.set('trust proxy', 1);
{{#if SEC_HELMET}}

  app.use(helmet());
{{/if}}
{{#if SEC_CORS}}

  const allowed = new Set(config.http.corsOrigins);
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || allowed.has(origin)),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'{{#if API_ENCRYPTION}}, 'X-Encryption-Key-Id'{{/if}}],
      exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
      maxAge: 600,
    }),
  );
{{/if}}

{{#if SEC_BODY_LIMIT}}
  app.use(express.json({ limit: config.http.bodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: config.http.bodyLimit }));
{{else}}
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
{{/if}}
{{#if SEC_SANITIZE}}
  app.use(sanitizeInput);
{{/if}}
}
