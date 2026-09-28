import { existsSync } from 'node:fs';
import { z } from 'zod';

// Local development: load `.env` (Node's built-in loader). Variables that are already set
// in the environment (Docker, CI, the hosting platform) always win.
if (process.env.NODE_ENV !== 'production' && existsSync('.env')) {
  process.loadEnvFile('.env');
}

const boolean = z.enum(['true', 'false']).transform(value => value === 'true');
{{#if AUTH}}
const duration = z.string().regex(/^\d+(ms|s|m|h|d)$/, 'use a duration like 15m, 12h or 30d');
{{/if}}
{{#if SEC_CORS}}
const list = z.string().transform(value =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean),
);
{{/if}}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  APP_URL: z.url().default('http://localhost:3000'),
  API_PREFIX: z.string().regex(/^[a-z0-9-]+$/).default('api'),
  API_VERSION: z.string().regex(/^v\d+$/, 'e.g. v1').default('v1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TRUST_PROXY: boolean.default(false),
{{#if SEC_CORS}}
  CORS_ORIGINS: list.default([]),
{{/if}}
{{#if SEC_BODY_LIMIT}}
  BODY_LIMIT: z.string().regex(/^\d+(b|kb|mb)$/i, 'e.g. 1mb').default('1mb'),
{{/if}}
{{#if SEC_RATE_LIMIT}}
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
{{/if}}
{{#if SEC_AUTH_RATE_LIMIT}}
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
{{/if}}
  DATABASE_URL: z.string().min(1),
{{#if AUTH}}
  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
{{#if AUTH_JWT_ONLY}}
  JWT_ACCESS_EXPIRES_IN: duration.default('1d'),
{{else}}
  JWT_ACCESS_EXPIRES_IN: duration.default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: duration.default('30d'),
{{/if}}
  JWT_ISSUER: z.string().default('{{APP_SLUG}}'),
  JWT_AUDIENCE: z.string().default('{{APP_SLUG}}-app'),
  PASSWORD_RESET_TOKEN_TTL: duration.default('1h'),
  EMAIL_VERIFICATION_TOKEN_TTL: duration.default('24h'),
{{#if HASH_CONFIGURABLE}}
  PASSWORD_HASH_ALGORITHM: z.enum(['argon2', 'bcrypt']).default('argon2'),
{{/if}}
{{#if HASH_CONFIGURABLE}}
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
{{/if}}
{{#if HASH_BCRYPT}}
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
{{/if}}
{{#if SEC_LOCKOUT}}
  ACCOUNT_LOCKOUT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  ACCOUNT_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
{{/if}}
  SEED_ADMIN_EMAIL: z.email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  SEED_ADMIN_NAME: z.string().default('Administrator'),
{{/if}}
{{#if SWAGGER}}
  SWAGGER_ENABLED: boolean.default(true),
  SWAGGER_PATH: z.string().regex(/^[a-z0-9/-]+$/).default('docs'),
{{/if}}
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map(issue => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
  // The logger depends on this config, so this is the one place that writes to stderr directly.
  process.stderr.write(`Invalid environment configuration:\n${problems}\n\nSee .env.example.\n`);
  process.exit(1);
}
const env = parsed.data;
{{#if AUTH}}
{{#if AUTH_REFRESH}}
if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
  process.stderr.write('Invalid environment configuration: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.\n');
  process.exit(1);
}
{{/if}}
{{/if}}

/** Typed, validated configuration – the only place that reads `process.env`. */
export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  host: env.HOST,
  appUrl: env.APP_URL.replace(/\/$/, ''),
  api: {
    prefix: env.API_PREFIX,
    version: env.API_VERSION,
    /** e.g. `/api/v1` */
    basePath: `/${env.API_PREFIX}/${env.API_VERSION}`,
  },
  log: { level: env.LOG_LEVEL },
  http: {
    trustProxy: env.TRUST_PROXY,
{{#if SEC_CORS}}
    corsOrigins: env.CORS_ORIGINS,
{{/if}}
{{#if SEC_BODY_LIMIT}}
    bodyLimit: env.BODY_LIMIT,
{{/if}}
  },
{{#if SEC_RATE_LIMIT}}
  rateLimit: { windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX },
{{/if}}
{{#if SEC_AUTH_RATE_LIMIT}}
  authRateLimit: { windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX },
{{/if}}
  database: { url: env.DATABASE_URL },
{{#if AUTH}}
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
{{#if AUTH_REFRESH}}
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
{{/if}}
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  },
  tokens: {
    passwordResetTtl: env.PASSWORD_RESET_TOKEN_TTL,
    emailVerificationTtl: env.EMAIL_VERIFICATION_TOKEN_TTL,
  },
  password: {
{{#if HASH_CONFIGURABLE}}
    algorithm: env.PASSWORD_HASH_ALGORITHM,
{{/if}}
{{#if HASH_CONFIGURABLE}}
    bcryptRounds: env.BCRYPT_ROUNDS,
{{/if}}
{{#if HASH_BCRYPT}}
    bcryptRounds: env.BCRYPT_ROUNDS,
{{/if}}
{{#if HASH_ARGON2}}
    maxLength: 128,
{{else}}
    /** bcrypt only uses the first 72 bytes of a password. */
    maxLength: 72,
{{/if}}
    minLength: 8,
  },
{{#if SEC_LOCKOUT}}
  lockout: { maxAttempts: env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS, minutes: env.ACCOUNT_LOCKOUT_MINUTES },
{{/if}}
  seed: { adminEmail: env.SEED_ADMIN_EMAIL, adminPassword: env.SEED_ADMIN_PASSWORD, adminName: env.SEED_ADMIN_NAME },
{{/if}}
{{#if SWAGGER}}
  swagger: { enabled: env.SWAGGER_ENABLED, path: env.SWAGGER_PATH },
{{/if}}
} as const;

export type AppConfig = typeof config;
