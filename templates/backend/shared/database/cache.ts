import { redis } from '{{IMPORT:db.redis}}';

/** Values kept in memory when Redis isn't configured (tests). */
const memory = new Map<string, { value: string; expiresAt: number }>();
const PREFIX = 'cache:';

/**
 * A small cache for any service: JSON values with an expiry, stored in Redis.
 *
 *   const stats = await cache.remember('stats:today', 60, () => loadStats());
 *   await cache.del('stats:today'); // after the data changed
 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    let raw: string | null;
    if (redis) {
      raw = await redis.get(PREFIX + key);
    } else {
      const entry = memory.get(key);
      raw = entry && entry.expiresAt > Date.now() ? entry.value : null;
    }
    return raw === null ? null : (JSON.parse(raw) as T);
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (redis) await redis.set(PREFIX + key, raw, 'EX', ttlSeconds);
    else memory.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
  },

  async del(...keys: string[]): Promise<void> {
    if (!keys.length) return;
    if (redis) await redis.del(...keys.map(key => PREFIX + key));
    else keys.forEach(key => memory.delete(key));
  },

  /** The cached value, or `load()` – which is then cached for `ttlSeconds`. */
  async remember<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const cached = await cache.get<T>(key);
    if (cached !== null) return cached;
    const value = await load();
    await cache.set(key, value, ttlSeconds);
    return value;
  },
};
