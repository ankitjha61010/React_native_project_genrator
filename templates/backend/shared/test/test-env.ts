/**
 * Environment for unit + e2e tests (see vitest.config*.ts). No database is needed: the
 * tests use in-memory repositories. These are test-only values, not real secrets.
 */
export const testEnv: Record<string, string> = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  APP_URL: 'http://localhost:3000',
  API_PREFIX: 'api',
  API_VERSION: 'v1',
{{#if POSTGRES}}
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
{{/if}}
{{#if MYSQL}}
  DATABASE_URL: 'mysql://test:test@localhost:3306/test',
{{/if}}
{{#if MONGO}}
  DATABASE_URL: 'mongodb://localhost:27017/test',
{{/if}}
{{#if REDIS}}
  // No Redis in tests: rate limits, the cache{{#if SOCKET_SERVER}} and Socket.IO{{/if}} use memory, codes the in-memory repository.
  REDIS_URL: '',
{{/if}}
{{#if SEC_CORS}}
  CORS_ORIGINS: 'http://localhost:8081',
{{/if}}
{{#if SEC_RATE_LIMIT}}
  RATE_LIMIT_MAX: '10000',
{{/if}}
{{#if SEC_AUTH_RATE_LIMIT}}
  AUTH_RATE_LIMIT_MAX: '10000',
{{/if}}
{{#if AUTH}}
  JWT_ACCESS_SECRET: 'test-access-secret-test-access-secret-0123456789',
{{#if AUTH_REFRESH}}
  JWT_REFRESH_SECRET: 'test-refresh-secret-test-refresh-secret-0123456789',
{{/if}}
{{#if HASH_BCRYPT}}
  BCRYPT_ROUNDS: '4',
{{/if}}
{{#if HASH_CONFIGURABLE}}
  BCRYPT_ROUNDS: '4',
{{/if}}
{{#if SEC_LOCKOUT}}
  ACCOUNT_LOCKOUT_MAX_ATTEMPTS: '3',
  ACCOUNT_LOCKOUT_MINUTES: '15',
{{/if}}
{{/if}}
{{#if API_ENCRYPTION}}
  // Tests talk plain JSON; encryption itself is covered by encryption.spec.ts.
  API_ENCRYPTION_ENABLED: 'false',
  API_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
  API_ENCRYPTION_IV: 'abcdef9876543210',
{{/if}}
{{#if SWAGGER}}
  SWAGGER_ENABLED: 'true',
  SWAGGER_PATH: 'docs',
{{/if}}
};
