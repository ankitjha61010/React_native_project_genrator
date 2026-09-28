import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { config } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:core.logger}}';
import { createDatabase, type Database } from '{{IMPORT:db.connection}}';
import { DATABASE, HEALTH_CHECKS } from '{{IMPORT:nest.tokens}}';

/** Disconnects the database when the app shuts down (SIGTERM / app.close()). */
@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async onApplicationShutdown(): Promise<void> {
    await this.database.disconnect();
  }
}

/** {{DATABASE_LABEL}} via {{ORM_NAME}}: connects once at startup (with retries). */
@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: async (): Promise<Database> => {
        const database = createDatabase(config.database.url, logger);
        await database.connect();
        return database;
      },
    },
    { provide: HEALTH_CHECKS, useFactory: (database: Database) => [database.healthCheck], inject: [DATABASE] },
    DatabaseLifecycle,
  ],
  exports: [DATABASE, HEALTH_CHECKS],
})
export class DatabaseModule {}
