{{#if HASH_ARGON2}}
import argon2 from 'argon2';
{{/if}}
{{#if HASH_CONFIGURABLE}}
import argon2 from 'argon2';
{{/if}}
{{#if HASH_BCRYPT}}
import bcrypt from 'bcrypt';
{{/if}}
{{#if HASH_CONFIGURABLE}}
import bcrypt from 'bcrypt';
{{/if}}
import type { PasswordHasher } from '{{IMPORT:port.passwordHasher}}';
{{#if HASH_ARGON2}}

/** argon2id with the OWASP recommended minimum (19 MiB memory, 2 iterations). */
const ARGON2_OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export class Argon2PasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false; // malformed hash
    }
  }

  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, ARGON2_OPTIONS);
  }
}

export function createPasswordHasher(): PasswordHasher {
  return new Argon2PasswordHasher();
}
{{/if}}
{{#if HASH_BCRYPT}}

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds: number) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false; // malformed hash
    }
  }

  needsRehash(hash: string): boolean {
    return bcrypt.getRounds(hash) !== this.rounds;
  }
}

export function createPasswordHasher(options: { bcryptRounds: number }): PasswordHasher {
  return new BcryptPasswordHasher(options.bcryptRounds);
}
{{/if}}
{{#if HASH_CONFIGURABLE}}

export type PasswordHashAlgorithm = 'argon2' | 'bcrypt';

const ARGON2_OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

const isBcryptHash = (hash: string) => /^\$2[aby]\$/.test(hash);

/**
 * Hashes with the configured algorithm (PASSWORD_HASH_ALGORITHM) and verifies hashes of
 * BOTH algorithms, so switching algorithm never locks users out – their hash is upgraded
 * at the next successful login (`needsRehash`).
 */
export class ConfigurablePasswordHasher implements PasswordHasher {
  constructor(
    private readonly algorithm: PasswordHashAlgorithm,
    private readonly bcryptRounds: number,
  ) {}

  hash(password: string): Promise<string> {
    return this.algorithm === 'bcrypt' ? bcrypt.hash(password, this.bcryptRounds) : argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return isBcryptHash(hash) ? await bcrypt.compare(password, hash) : await argon2.verify(hash, password);
    } catch {
      return false; // malformed hash
    }
  }

  needsRehash(hash: string): boolean {
    if (this.algorithm === 'bcrypt') return !isBcryptHash(hash) || bcrypt.getRounds(hash) !== this.bcryptRounds;
    return isBcryptHash(hash) || argon2.needsRehash(hash, ARGON2_OPTIONS);
  }
}

export function createPasswordHasher(options: { algorithm: PasswordHashAlgorithm; bcryptRounds: number }): PasswordHasher {
  return new ConfigurablePasswordHasher(options.algorithm, options.bcryptRounds);
}
{{/if}}
