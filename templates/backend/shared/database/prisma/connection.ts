{{#if POSTGRES}}
import { PrismaPg } from '@prisma/adapter-pg';
{{else}}
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
{{/if}}
import type { Logger } from '{{IMPORT:core.logger}}';
import type { HealthCheck } from '{{IMPORT:port.healthCheck}}';
import { PrismaClient } from '{{IMPORT:path:src/generated/prisma/client.ts}}';

export type { PrismaClient };

export interface Database {
  readonly client: PrismaClient;
  readonly healthCheck: HealthCheck;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
{{#if MYSQL}}

/** The MariaDB driver (also used for MySQL) takes the connection as fields. */
function mysqlConnection(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    connectionLimit: Number(parsed.searchParams.get('connection_limit') ?? 10),
    // MySQL 8 default authentication.
    allowPublicKeyRetrieval: true,
  };
}
{{/if}}

/** Prisma client ({{DATABASE_LABEL}} driver adapter) with retrying connect + health check. */
export function createDatabase(url: string, logger: Logger): Database {
{{#if POSTGRES}}
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
{{else}}
  const client = new PrismaClient({ adapter: new PrismaMariaDb(mysqlConnection(url)) });
{{/if}}

  return {
    client,
    healthCheck: {
      name: 'database',
      async check() {
        await client.$queryRaw`SELECT 1`;
      },
    },
    async connect() {
      const attempts = 5;
      for (let attempt = 1; ; attempt++) {
        try {
          await client.$connect();
          await client.$queryRaw`SELECT 1`;
          logger.info('Database connected');
          return;
        } catch (error) {
          if (attempt >= attempts) throw error;
          const delay = attempt * 1000;
          logger.warn({ err: error, attempt }, `Database not reachable, retrying in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    },
    async disconnect() {
      await client.$disconnect();
      logger.info('Database disconnected');
    },
  };
}

/** Prisma error helpers used by the repositories. */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

export function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2025';
}
