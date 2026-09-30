import { config } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:core.logger}}';
import { createDatabase } from '{{IMPORT:db.connection}}';
import { createRepositories } from '{{IMPORT:db.repositories}}';
{{#if AUTH}}
import { UserRole } from '{{IMPORT:domain.roles}}';
import { normalizeEmail{{#if AUTH_OTP}}, normalizePhone{{/if}}, type User } from '{{IMPORT:domain.user}}';
{{/if}}
{{#if AUTH_EMAIL}}
import { createPasswordHasher } from '{{IMPORT:impl.passwordHasher}}';
import { assertPasswordPolicy } from '{{IMPORT:app.authTypes}}';
{{/if}}

/**
 * Seeds the database (safe to run repeatedly): `npm run db:seed`.
{{#if AUTH}}
 * Creates – or promotes – the administrator from SEED_ADMIN_*.
{{else}}
 * Creates a few demo users.
{{/if}}
 */
const database = createDatabase(config.database.url, logger);
await database.connect();

try {
  const { users } = createRepositories(database);
{{#if AUTH}}
  const { adminEmail, adminName{{#if AUTH_EMAIL}}, adminPassword{{/if}}{{#if AUTH_OTP}}, adminCountryCode, adminPhone{{/if}} } = config.seed;
  const email = adminEmail ? normalizeEmail(adminEmail) : null;
{{#if AUTH_OTP}}
  const phone = adminCountryCode && adminPhone ? normalizePhone(adminCountryCode, adminPhone) : null;
{{/if}}

  let admin: User | null = email ? await users.findByEmail(email) : null;
{{#if AUTH_OTP}}
  if (!admin && phone) admin = await users.findByPhone(phone.countryCode, phone.phone);
{{/if}}

  if (admin) {
    if (admin.role !== UserRole.ADMIN) await users.update(admin.id, { role: UserRole.ADMIN });
    logger.info({ userId: admin.id }, 'Administrator ready');
  } else if (!email{{#if AUTH_OTP}} && !phone{{/if}}) {
    logger.warn('SEED_ADMIN_EMAIL{{#if AUTH_OTP}} / SEED_ADMIN_PHONE{{/if}} not set – no administrator created');
  } else {
{{#if AUTH_EMAIL}}
    let passwordHash: string | null = null;
    if (adminPassword) {
      assertPasswordPolicy(adminPassword, config.password, 'SEED_ADMIN_PASSWORD');
{{#if HASH_ARGON2}}
      passwordHash = await createPasswordHasher().hash(adminPassword);
{{else}}
      passwordHash = await createPasswordHasher(config.password).hash(adminPassword);
{{/if}}
    }
{{/if}}
    admin = await users.create({
      email,
      emailVerifiedAt: email ? new Date() : null,
{{#if AUTH_EMAIL}}
      passwordHash,
{{/if}}
{{#if AUTH_OTP}}
      countryCode: phone?.countryCode ?? null,
      phone: phone?.phone ?? null,
      phoneVerifiedAt: phone ? new Date() : null,
{{/if}}
      name: adminName,
      role: UserRole.ADMIN,
    });
    logger.info({ userId: admin.id }, 'Administrator created');
  }
{{#if SOCIAL}}
{{#if !AUTH_EMAIL}}
{{#if !AUTH_OTP}}
  // Social sign-in only: the administrator signs in with the provider account of SEED_ADMIN_EMAIL.
{{/if}}
{{/if}}
{{/if}}
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
