import 'reflect-metadata';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { config } from '{{IMPORT:config.env}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { HealthCheck } from '{{IMPORT:port.healthCheck}}';
{{#if AUTH_REFRESH}}
import { RefreshTokenOrmEntity } from '{{IMPORT:typeorm.auth}}';
{{/if}}
{{#if DB_CODES}}
import { VerificationCodeOrmEntity } from '{{IMPORT:typeorm.auth}}';
{{/if}}
{{#if SOCIAL}}
import { SocialAccountOrmEntity } from '{{IMPORT:typeorm.auth}}';
{{/if}}
{{#if CHAT}}
import { BlockedUserOrmEntity, ConversationMemberOrmEntity, ConversationOrmEntity, MessageOrmEntity } from '{{IMPORT:typeorm.chat}}';
{{/if}}
{{#if DEVICES}}
import { DeviceOrmEntity } from '{{IMPORT:typeorm.device}}';
{{/if}}
{{#if NOTIFICATIONS}}
import { BroadcastOrmEntity, NotificationOrmEntity } from '{{IMPORT:typeorm.notifications}}';
{{/if}}
{{#if LEGAL}}
import { LegalSettingsOrmEntity } from '{{IMPORT:typeorm.legal}}';
{{/if}}
import { UserOrmEntity } from '{{IMPORT:typeorm.user}}';

const here = path.dirname(fileURLToPath(import.meta.url));

export function createDataSource(url: string): DataSource {
  return new DataSource({
{{#if POSTGRES}}
    type: 'postgres',
    // gen_random_uuid() (built into PostgreSQL 13+) instead of the uuid-ossp extension.
    uuidExtension: 'pgcrypto',
{{else}}
    type: 'mysql',
    charset: 'utf8mb4',
{{/if}}
    url,
    entities: [
      UserOrmEntity,
{{#if AUTH_REFRESH}}
      RefreshTokenOrmEntity,
{{/if}}
{{#if DB_CODES}}
      VerificationCodeOrmEntity,
{{/if}}
{{#if SOCIAL}}
      SocialAccountOrmEntity,
{{/if}}
{{#if CHAT}}
      ConversationOrmEntity,
      ConversationMemberOrmEntity,
      MessageOrmEntity,
      BlockedUserOrmEntity,
{{/if}}
{{#if DEVICES}}
      DeviceOrmEntity,
{{/if}}
{{#if NOTIFICATIONS}}
      NotificationOrmEntity,
      BroadcastOrmEntity,
{{/if}}
{{#if LEGAL}}
      LegalSettingsOrmEntity,
{{/if}}
    ],
    // Schema changes only through migrations – never `synchronize` in a real database.
    migrations: [path.join(here, 'migrations', '*.{ts,js}')],
    synchronize: false,
    logging: false,
  });
}

/** Used by the TypeORM CLI (`npm run db:migrate`, `npm run db:migration:generate`). */
export default createDataSource(config.database.url);

export interface Database {
  readonly dataSource: DataSource;
  readonly healthCheck: HealthCheck;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export function createDatabase(url: string, logger: Logger): Database {
  const dataSource = createDataSource(url);

  return {
    dataSource,
    healthCheck: {
      name: 'database',
      async check() {
        await dataSource.query('SELECT 1');
      },
    },
    async connect() {
      const attempts = 5;
      for (let attempt = 1; ; attempt++) {
        try {
          if (!dataSource.isInitialized) await dataSource.initialize();
          if (await dataSource.showMigrations()) {
            logger.warn('There are pending migrations – run `npm run db:migrate`');
          }
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
      if (dataSource.isInitialized) await dataSource.destroy();
      logger.info('Database disconnected');
    },
  };
}

/** Driver error helpers used by the repositories. */
export function isUniqueViolation(error: unknown): boolean {
  const code = (error as { driverError?: { code?: string } })?.driverError?.code;
{{#if POSTGRES}}
  return code === '23505';
{{else}}
  return code === 'ER_DUP_ENTRY';
{{/if}}
}
