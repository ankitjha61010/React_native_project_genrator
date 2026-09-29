import { Redis } from 'ioredis';
import { config } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:core.logger}}';
import type { HealthCheck } from '{{IMPORT:port.healthCheck}}';

/**
 * The app's one Redis connection (REDIS_URL). It is used for:
 *   - rate limits shared by every server instance{{#if SOCKET_SERVER}}
 *   - Socket.IO, so events reach users connected to another instance{{/if}}
 *   - the cache helper (cache.ts){{#if REDIS_CODES}}
 *   - verification / OTP codes, which expire by themselves{{/if}}
 *
 * `null` when REDIS_URL is empty – the tests run without Redis and use in-memory fallbacks.
 * It connects on the first command, so importing this file never opens a connection.
 */
export const redis: Redis | null = config.redis.url ? connect(config.redis.url) : null;

function connect(url: string): Redis {
  // Commands fail after 3 retries instead of waiting forever while Redis is down.
  const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
  client.on('error', error => logger.warn({ err: error }, 'Redis error'));
  return client;
}

/** The connection, for code that can't work without Redis. */
export function requireRedis(): Redis {
  if (!redis) throw new Error('REDIS_URL is not set – Redis is required (see .env.example)');
  return redis;
}

{{#if SOCKET_SERVER}}
const extraConnections: Redis[] = [];

/** One more connection (Socket.IO needs its own pair for publish / subscribe) – closed by closeRedis(). */
export function newRedisConnection(): Redis {
  const connection = requireRedis().duplicate();
  connection.on('error', error => logger.warn({ err: error }, 'Redis error'));
  extraConnections.push(connection);
  return connection;
}

{{/if}}
/** Checked by GET /health. */
export const redisHealthCheck: HealthCheck = {
  name: 'redis',
  check: async () => {
    await requireRedis().ping();
  },
};

/** Closes {{#if SOCKET_SERVER}}every connection{{else}}the connection{{/if}} (graceful shutdown). */
export async function closeRedis(): Promise<void> {
  if (!redis) return;
{{#if SOCKET_SERVER}}
  await Promise.all([redis, ...extraConnections].map(close));
}

async function close(connection: Redis): Promise<void> {
  // Never connected (nothing used it yet): nothing to say goodbye to.
  if (connection.status === 'wait') connection.disconnect();
  else await connection.quit().catch(() => connection.disconnect());
}
{{else}}
  // Never connected (nothing used Redis yet): nothing to say goodbye to.
  if (redis.status === 'wait') redis.disconnect();
  else await redis.quit().catch(() => redis.disconnect());
}
{{/if}}
