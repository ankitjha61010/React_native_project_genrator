import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

/** URL safe random token (default 256 bits). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Numeric one-time code, e.g. "042917" (cryptographically random). */
export function randomDigits(length = 6): string {
  return Array.from({ length }, () => randomInt(10)).join('');
}

export function newId(): string {
  return randomUUID();
}

/** Tokens are stored as SHA-256 hashes, so a database leak doesn't leak usable tokens. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

const UNITS: Record<string, number> = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** `15m` → 900000 (milliseconds). Formats are validated in config/env.ts. */
export function parseDuration(value: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(value);
  if (!match) throw new Error(`Invalid duration "${value}"`);
  return Number(match[1]) * (UNITS[match[2] ?? ''] ?? 0);
}
