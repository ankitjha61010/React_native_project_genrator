const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
/** Never trimmed: a password may legitimately start or end with a space. */
const UNTRIMMED_KEY = /password/i;

/**
 * Removes keys that could inject query operators or pollute prototypes (`$where`,
 * `a.b`, `__proto__`) and trims strings. Validation still runs afterwards – this is a
 * second line of defence, not a replacement for schemas.
 */
export function sanitize<T>(value: T, depth = 0, key = ''): T {
  if (depth > 20) return value;
  if (typeof value === 'string') return (UNTRIMMED_KEY.test(key) ? value : value.trim()) as T;
  if (Array.isArray(value)) return value.map(item => sanitize(item, depth + 1, key)) as T;
  if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const clean: Record<string, unknown> = {};
    for (const [name, item] of Object.entries(value)) {
      if (name.startsWith('$') || name.includes('.') || FORBIDDEN_KEYS.has(name)) continue;
      clean[name] = sanitize(item, depth + 1, name);
    }
    return clean as T;
  }
  return value;
}
