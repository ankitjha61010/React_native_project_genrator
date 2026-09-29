import type { Redis } from 'ioredis';
import type { CodePurpose, VerificationCode } from '{{IMPORT:domain.authTokens}}';
import type { VerificationCodesRepository } from '{{IMPORT:contract.auth}}';

/** Kept a while after the code expired, so "wait before asking again" still works. */
const KEEP_AFTER_EXPIRY_MS = 60 * 60 * 1000;

type Stored = Omit<VerificationCode, 'expiresAt' | 'usedAt' | 'createdAt'> & { expiresAt: string; usedAt: string | null; createdAt: string };

const fromStored = (s: Stored): VerificationCode => ({ ...s, expiresAt: new Date(s.expiresAt), usedAt: s.usedAt ? new Date(s.usedAt) : null, createdAt: new Date(s.createdAt) });

/**
 * Verification / OTP codes in Redis. Only the newest code of a purpose + target matters, so
 * each one is a single key (`code:<purpose>:<target>`) that Redis deletes by itself.
 */
export class RedisVerificationCodesRepository implements VerificationCodesRepository {
  constructor(private readonly redis: Redis) {}

  async create(data: Pick<VerificationCode, 'purpose' | 'target' | 'codeHash' | 'expiresAt'>): Promise<VerificationCode> {
    const code: VerificationCode = { id: key(data.purpose, data.target), ...data, attempts: 0, usedAt: null, createdAt: new Date() };
    const ttl = Math.max(1, data.expiresAt.getTime() - Date.now()) + KEEP_AFTER_EXPIRY_MS;
    await this.redis.set(code.id, JSON.stringify(code), 'PX', ttl);
    return code;
  }

  async findActive(purpose: CodePurpose, target: string, now: Date): Promise<VerificationCode | null> {
    const code = await this.get(key(purpose, target));
    return code && !code.usedAt && code.expiresAt > now ? code : null;
  }

  async findLatest(purpose: CodePurpose, target: string): Promise<VerificationCode | null> {
    return this.get(key(purpose, target));
  }

  async incrementAttempts(id: string): Promise<void> {
    const code = await this.get(id);
    if (code) await this.save({ ...code, attempts: code.attempts + 1 });
  }

  async markUsed(id: string): Promise<void> {
    const code = await this.get(id);
    if (code && !code.usedAt) await this.save({ ...code, usedAt: new Date() });
  }

  async invalidateAll(purpose: CodePurpose, target: string): Promise<void> {
    await this.markUsed(key(purpose, target));
  }

  private async get(id: string): Promise<VerificationCode | null> {
    const raw = await this.redis.get(id);
    return raw ? fromStored(JSON.parse(raw) as Stored) : null;
  }

  /** Updates the code, keeping its expiry. */
  private async save(code: VerificationCode): Promise<void> {
    await this.redis.set(code.id, JSON.stringify(code), 'KEEPTTL');
  }
}

function key(purpose: CodePurpose, target: string): string {
  return `code:${purpose}:${target}`;
}
