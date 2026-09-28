{{#if HASH_CONFIGURABLE}}
import { config } from '{{IMPORT:config.env}}';
import { ConfigurablePasswordHasher, createPasswordHasher } from '{{IMPORT:impl.passwordHasher}}';
{{/if}}
{{#if HASH_BCRYPT}}
import { config } from '{{IMPORT:config.env}}';
import { createPasswordHasher } from '{{IMPORT:impl.passwordHasher}}';
{{/if}}
{{#if HASH_ARGON2}}
import { createPasswordHasher } from '{{IMPORT:impl.passwordHasher}}';
{{/if}}

describe('password hashing', () => {
{{#if HASH_ARGON2}}
  const hasher = createPasswordHasher();
{{else}}
  const hasher = createPasswordHasher(config.password);
{{/if}}

  it('never stores the plain password and verifies it', async () => {
    const hash = await hasher.hash('Sup3rSecret');
    expect(hash).not.toContain('Sup3rSecret');
    expect(await hasher.verify(hash, 'Sup3rSecret')).toBe(true);
    expect(await hasher.verify(hash, 'sup3rsecret')).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hasher.hash('Sup3rSecret')).not.toBe(await hasher.hash('Sup3rSecret'));
  });

  it('treats a malformed hash as a failed check', async () => {
    expect(await hasher.verify('not-a-hash', 'Sup3rSecret')).toBe(false);
  });

  it('does not ask to re-hash a fresh hash', async () => {
    expect(hasher.needsRehash(await hasher.hash('Sup3rSecret'))).toBe(false);
  });
{{#if HASH_CONFIGURABLE}}

  it('verifies hashes of the other algorithm and asks to upgrade them', async () => {
    const bcrypt = new ConfigurablePasswordHasher('bcrypt', 4);
    const argon2 = new ConfigurablePasswordHasher('argon2', 4);
    const oldHash = await bcrypt.hash('Sup3rSecret');

    expect(await argon2.verify(oldHash, 'Sup3rSecret')).toBe(true);
    expect(argon2.needsRehash(oldHash)).toBe(true);
  });
{{/if}}
});
