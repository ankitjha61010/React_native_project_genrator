import { cache } from '{{IMPORT:db.cache}}';

// The tests run without Redis (REDIS_URL is empty), so this checks the in-memory fallback –
// the Redis version behaves the same.
describe('cache', () => {
  it('stores JSON values until they expire', async () => {
    await cache.set('greeting', { text: 'hi' }, 60);
    expect(await cache.get('greeting')).toEqual({ text: 'hi' });

    await cache.set('gone', 1, -1);
    expect(await cache.get('gone')).toBeNull();
  });

  it('remember() loads once, then answers from the cache', async () => {
    const load = vi.fn<() => Promise<number>>(async () => 42);
    expect(await cache.remember('answer', 60, load)).toBe(42);
    expect(await cache.remember('answer', 60, load)).toBe(42);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('del() forgets a value', async () => {
    await cache.set('temp', 'x', 60);
    await cache.del('temp');
    expect(await cache.get('temp')).toBeNull();
  });
});
