import { config } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:core.logger}}';
import { createDatabase } from '{{IMPORT:db.connection}}';
{{#if AUTH}}
import { normalizeEmail } from '{{IMPORT:domain.user}}';
import { createPasswordHasher } from '{{IMPORT:impl.passwordHasher}}';
import { assertPasswordPolicy } from '{{IMPORT:app.authTypes}}';
{{/if}}
{{#if PRISMA}}
import { PrismaUsersRepository } from '{{IMPORT:repo.users}}';
{{/if}}
{{#if TYPEORM}}
import { TypeOrmUsersRepository } from '{{IMPORT:repo.users}}';
{{/if}}
{{#if MONGOOSE}}
import { MongooseUsersRepository } from '{{IMPORT:repo.users}}';
{{/if}}

/**
 * Seeds the database (safe to run repeatedly): `npm run db:seed`.
{{#if AUTH}}
 * Creates the administrator from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
{{else}}
 * Creates a few demo users.
{{/if}}
 */
const database = createDatabase(config.database.url, logger);
await database.connect();

try {
{{#if PRISMA}}
  const users = new PrismaUsersRepository(database.client);
{{/if}}
{{#if TYPEORM}}
  const users = new TypeOrmUsersRepository(database.dataSource);
{{/if}}
{{#if MONGOOSE}}
  const users = new MongooseUsersRepository();
{{/if}}
{{#if AUTH}}
  const { adminEmail, adminPassword, adminName } = config.seed;

  if (!adminEmail || !adminPassword) {
    logger.warn('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set – no administrator created');
  } else if (await users.findByEmail(normalizeEmail(adminEmail))) {
    logger.info({ email: adminEmail }, 'Administrator already exists');
  } else {
    assertPasswordPolicy(adminPassword, config.password, 'SEED_ADMIN_PASSWORD');
{{#if HASH_ARGON2}}
    const hasher = createPasswordHasher();
{{else}}
    const hasher = createPasswordHasher(config.password);
{{/if}}
    await users.create({
      email: normalizeEmail(adminEmail),
      name: adminName,
      passwordHash: await hasher.hash(adminPassword),
      role: 'admin',
      emailVerifiedAt: new Date(),
    });
    logger.info({ email: adminEmail }, 'Administrator created');
  }
{{else}}
  const demo = [
    { email: 'ada@example.com', name: 'Ada Lovelace' },
    { email: 'alan@example.com', name: 'Alan Turing' },
  ];
  for (const user of demo) {
    if (await users.findByEmail(user.email)) continue;
    await users.create(user);
    logger.info({ email: user.email }, 'Demo user created');
  }
{{/if}}
} finally {
  await database.disconnect();
}
