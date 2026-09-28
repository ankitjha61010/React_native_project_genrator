import { existsSync } from 'node:fs';
import { defineConfig, env } from 'prisma/config';

// The Prisma CLI doesn't read .env on its own.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
{{#if USERS_API}}
    seed: 'tsx {{SEED_TS}}',
{{/if}}
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
