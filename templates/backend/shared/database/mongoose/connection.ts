import mongoose from 'mongoose';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { HealthCheck } from '{{IMPORT:port.healthCheck}}';

export interface Database {
  readonly healthCheck: HealthCheck;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

/** Mongoose connection with retrying connect, health check and index creation. */
export function createDatabase(url: string, logger: Logger): Database {
  mongoose.set('strictQuery', true);
  // Queries fail fast instead of being buffered while disconnected.
  mongoose.set('bufferCommands', false);

  return {
    healthCheck: {
      name: 'database',
      async check() {
        if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected || !mongoose.connection.db) throw new Error('Not connected');
        await mongoose.connection.db.admin().ping();
      },
    },
    async connect() {
      const attempts = 5;
      for (let attempt = 1; ; attempt++) {
        try {
          await mongoose.connect(url, { serverSelectionTimeoutMS: 5_000 });
          await mongoose.syncIndexes();
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
      await mongoose.disconnect();
      logger.info('Database disconnected');
    },
  };
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

export function isValidId(id: string): boolean {
  return mongoose.isValidObjectId(id);
}
