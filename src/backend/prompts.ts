import path from 'node:path';
import { checkbox, confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import type { CliFlags } from '../cli/args.js';
import { log } from '../cli/logger.js';
import { GeneratorError } from '../utils/errors.js';
import { resolveUserPath } from '../utils/paths.js';
import { BACKEND_ARCHITECTURES, getBackendArchitecture } from './architectures.js';
import { AUTH_LABELS, DATABASE_LABELS, FRAMEWORK_LABELS, HASHING_LABELS, ORM_LABELS } from './context.js';
import {
  DEFAULT_SECURITY,
  type BackendArchitectureId,
  type BackendAuth,
  type BackendDatabase,
  type BackendFramework,
  type BackendOptions,
  type BackendOrm,
  type BackendSecurity,
  type PasswordHashing,
} from './types.js';

export const BACKEND_FRAMEWORKS: BackendFramework[] = ['nestjs', 'express'];
export const BACKEND_DATABASES: BackendDatabase[] = ['postgresql', 'mysql', 'mongodb'];
export const BACKEND_ORMS: BackendOrm[] = ['prisma', 'typeorm', 'mongoose'];
export const BACKEND_AUTHS: BackendAuth[] = ['none', 'jwt', 'access-refresh', 'refresh-rotation'];
export const PASSWORD_HASHINGS: PasswordHashing[] = ['bcrypt', 'argon2', 'configurable'];

/** `--security` items → option keys. */
export const SECURITY_ITEMS: Record<string, keyof BackendSecurity> = {
  helmet: 'helmet',
  cors: 'cors',
  'rate-limit': 'rateLimit',
  'auth-rate-limit': 'authRateLimit',
  'body-limit': 'bodyLimit',
  sanitize: 'sanitize',
  'account-lockout': 'accountLockout',
};

const SECURITY_CHOICES: Array<{ key: keyof BackendSecurity; name: string; description: string; authOnly?: boolean }> = [
  { key: 'rateLimit', name: 'Rate limiter (all routes)', description: 'Per-IP request limit with standard RateLimit headers (429 when exceeded)' },
  { key: 'authRateLimit', name: 'Strict rate limit on auth routes', description: 'Brute-force protection for login, register, refresh, password reset', authOnly: true },
  { key: 'accountLockout', name: 'Account lockout', description: 'Locks an account for a while after repeated failed logins', authOnly: true },
  { key: 'helmet', name: 'Helmet security headers', description: 'CSP, HSTS, no-sniff, frame protection…' },
  { key: 'cors', name: 'CORS allow-list', description: 'Only origins in CORS_ORIGINS may call the API from a browser' },
  { key: 'bodyLimit', name: 'Request body size limit', description: 'Rejects oversized payloads (413)' },
  { key: 'sanitize', name: 'Input sanitization', description: 'Strips $-operators, dotted keys and __proto__ from body / query' },
];

/** Backend project names: package-name friendly (letters, digits, dashes). */
export function validateBackendName(name: string): true | string {
  const value = name.trim();
  if (!value) return 'Project name is required.';
  if (value.length > 60) return 'Project name must be at most 60 characters.';
  if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(value)) return 'Use letters, digits and dashes, starting with a letter (e.g. my-api).';
  return true;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], flag: string): T | undefined {
  if (value === undefined) return undefined;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new GeneratorError(`Invalid ${flag}: "${value}".`, { reason: `Allowed: ${allowed.join(', ')}` });
  }
  return value as T;
}

function parseSecurityFlag(value: string | undefined): BackendSecurity | undefined {
  if (value === undefined) return undefined;
  const security: BackendSecurity = { helmet: false, cors: false, rateLimit: false, authRateLimit: false, bodyLimit: false, sanitize: false, accountLockout: false };
  if (value === 'none') return security;
  if (value === 'all') return { ...DEFAULT_SECURITY };
  for (const item of value.split(',').map(s => s.trim()).filter(Boolean)) {
    const key = SECURITY_ITEMS[item];
    if (!key) throw new GeneratorError(`Invalid --security item "${item}".`, { reason: `Allowed: all, none, ${Object.keys(SECURITY_ITEMS).join(', ')}` });
    security[key] = true;
  }
  return security;
}

export function describeBackend(o: BackendOptions): string[] {
  const arch = getBackendArchitecture(o.architecture);
  const s = o.security;
  const auth = o.auth !== 'none';
  const on = (value: boolean) => (value ? chalk.green('yes') : chalk.dim('no'));
  return [
    `Project:        ${o.appName} → ${o.projectDir}`,
    `Framework:      ${FRAMEWORK_LABELS[o.framework]}`,
    `Architecture:   ${arch.name}`,
    `Database:       ${DATABASE_LABELS[o.database]} (${ORM_LABELS[o.orm]})`,
    `Authentication: ${AUTH_LABELS[o.auth]}`,
    ...(auth ? [`Hashing:        ${HASHING_LABELS[o.hashing]}`] : []),
    `Swagger:        ${on(o.swagger)}`,
    `Rate limiting:  ${on(s.rateLimit)} global · ${on(auth && s.authRateLimit)} auth routes`,
    `Security:       helmet ${on(s.helmet)} · CORS ${on(s.cors)} · body limit ${on(s.bodyLimit)} · sanitize ${on(s.sanitize)}${auth ? ` · lockout ${on(s.accountLockout)}` : ''}`,
    `Install deps:   ${on(o.installDependencies)}   Git: ${on(o.initGit)}`,
  ];
}

/**
 * Backend wizard. Flags are used as-is; everything else is asked (or defaulted with --yes).
 * Ends with a summary: generate, go back and modify, or cancel.
 */
export async function collectBackendOptions(flags: CliFlags, previous?: BackendOptions): Promise<BackendOptions> {
  const interactive = !flags.yes;
  const ask = <T>(flagValue: T | undefined, question: () => Promise<T>, fallback: T, label: string, format: (v: T) => string = String): Promise<T> => {
    if (flagValue !== undefined) {
      log.success(`${label}: ${chalk.cyan(format(flagValue))}`);
      return Promise.resolve(flagValue);
    }
    return interactive ? question() : Promise.resolve(fallback);
  };

  // Name + location
  let appName = flags.name?.trim();
  if (appName) {
    const valid = validateBackendName(appName);
    if (valid !== true) throw new GeneratorError(`Invalid --name: ${valid}`);
  } else if (interactive) {
    appName = (await input({ message: 'Backend project name:', default: previous?.appName ?? 'my-api', validate: validateBackendName })).trim();
  } else {
    throw new GeneratorError('--name is required with --yes.');
  }
  const parentDir = resolveUserPath(flags.directory ?? (interactive && !previous ? await input({ message: 'Where should the project be created?', default: './' }) : previous ? path.dirname(previous.projectDir) : './'));

  const framework = await ask(
    oneOf(flags.backendFramework, BACKEND_FRAMEWORKS, '--backend-framework'),
    () =>
      select({
        message: 'Which backend framework do you want to use?',
        default: previous?.framework,
        choices: [
          { name: '1. NestJS', value: 'nestjs' as const, description: 'Modules, DI, guards, pipes – opinionated and batteries included' },
          { name: '2. Express.js + Node.js', value: 'express' as const, description: 'Minimal and explicit – routers, middleware and a composition root' },
        ],
      }),
    'nestjs',
    'Backend framework',
    v => FRAMEWORK_LABELS[v],
  );

  const architecture = await ask(
    oneOf(flags.backendArchitecture, BACKEND_ARCHITECTURES.map(a => a.id), '--backend-architecture'),
    () =>
      select<BackendArchitectureId>({
        message: 'Select Backend Architecture',
        default: previous?.architecture,
        pageSize: BACKEND_ARCHITECTURES.length,
        choices: BACKEND_ARCHITECTURES.map((a, i) => ({
          name: `${i + 1}. ${a.name}`,
          value: a.id,
          description: `${chalk.dim(a.summary)}\n\n${a.preview(framework)}`,
        })),
      }),
    'feature-based',
    'Architecture',
    v => getBackendArchitecture(v).name,
  );

  // Authentication
  let auth: BackendAuth;
  if (flags.backendAuth !== undefined) {
    auth = oneOf(flags.backendAuth, BACKEND_AUTHS, '--backend-auth')!;
    log.success(`Authentication: ${chalk.cyan(AUTH_LABELS[auth])}`);
  } else if (interactive) {
    const wantsAuth = await select({
      message: 'Do you want authentication?',
      default: previous ? previous.auth !== 'none' : true,
      choices: [
        { name: '1. Yes', value: true },
        { name: '2. No', value: false },
      ],
    });
    auth = wantsAuth
      ? await select<BackendAuth>({
          message: 'Authentication Type',
          default: previous && previous.auth !== 'none' ? previous.auth : 'refresh-rotation',
          choices: [
            { name: '1. JWT', value: 'jwt', description: 'One access token; logout / password change revoke every token (token version)' },
            { name: '2. Access Token + Refresh Token', value: 'access-refresh', description: 'Short-lived access token, revocable refresh token stored hashed' },
            { name: '3. JWT + Refresh Token + Rotation', value: 'refresh-rotation', description: 'New refresh token on every refresh; reuse of an old one revokes the session (recommended)' },
          ],
        })
      : 'none';
  } else {
    auth = 'refresh-rotation';
  }

  // Password hashing
  let hashing: PasswordHashing = 'none';
  if (auth !== 'none') {
    hashing = await ask(
      oneOf(flags.passwordHashing, PASSWORD_HASHINGS, '--password-hashing'),
      () =>
        select<PasswordHashing>({
          message: 'Which password hashing / crypto strategy do you want?',
          default: previous && previous.hashing !== 'none' ? previous.hashing : 'argon2',
          choices: [
            { name: '1. bcrypt', value: 'bcrypt', description: 'Battle-tested, cost factor via BCRYPT_ROUNDS' },
            { name: '2. Argon2', value: 'argon2', description: 'argon2id – current OWASP recommendation (recommended)' },
            { name: '3. Custom/Configurable', value: 'configurable', description: 'PASSWORD_HASH_ALGORITHM picks bcrypt or Argon2; old hashes keep working and are upgraded at login' },
            { name: '4. No password hashing', value: 'none', disabled: '(passwords are never stored in plain text)' },
          ],
        }),
      'argon2',
      'Password hashing',
      v => HASHING_LABELS[v],
    );
  }

  // Database + ORM
  const database = await ask(
    oneOf(flags.backendDatabase, BACKEND_DATABASES, '--backend-database'),
    () =>
      select<BackendDatabase>({
        message: 'Select Database',
        default: previous?.database,
        choices: [
          { name: '1. MySQL', value: 'mysql' },
          { name: '2. PostgreSQL', value: 'postgresql' },
          { name: '3. MongoDB', value: 'mongodb' },
        ],
      }),
    'postgresql',
    'Database',
    v => DATABASE_LABELS[v],
  );

  let orm: BackendOrm;
  const ormFlag = oneOf(flags.backendOrm, BACKEND_ORMS, '--backend-orm');
  if (database === 'mongodb') {
    if (ormFlag && ormFlag !== 'mongoose') throw new GeneratorError(`--backend-orm ${ormFlag} doesn't support MongoDB – use mongoose.`);
    orm = interactive && !ormFlag ? await select({ message: 'Select MongoDB ODM', choices: [{ name: '1. Mongoose', value: 'mongoose' as const }] }) : 'mongoose';
  } else {
    if (ormFlag === 'mongoose') throw new GeneratorError('--backend-orm mongoose requires --backend-database mongodb.');
    orm = await ask(
      ormFlag,
      () =>
        select<BackendOrm>({
          message: 'Select ORM',
          default: previous && previous.orm !== 'mongoose' ? previous.orm : 'prisma',
          choices: [
            { name: '1. Prisma', value: 'prisma', description: 'Schema file + generated, fully typed client; SQL migrations' },
            { name: '2. TypeORM', value: 'typeorm', description: 'Decorator entities, repositories, TypeScript migrations' },
          ],
        }),
      'prisma',
      'ORM',
      v => ORM_LABELS[v],
    );
  }

  // Security & rate limiting
  let security = parseSecurityFlag(flags.security);
  if (security) {
    log.success(`Security: ${chalk.cyan(Object.entries(security).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none')}`);
  } else if (interactive) {
    const current = previous?.security ?? DEFAULT_SECURITY;
    const picked = await checkbox<keyof BackendSecurity>({
      message: 'Security & rate limiting (space to toggle, enter to confirm)',
      pageSize: SECURITY_CHOICES.length,
      choices: SECURITY_CHOICES.filter(c => !c.authOnly || auth !== 'none').map(c => ({
        name: c.name,
        value: c.key,
        checked: current[c.key],
        description: c.description,
      })),
    });
    security = Object.fromEntries(Object.keys(DEFAULT_SECURITY).map(k => [k, picked.includes(k as keyof BackendSecurity)])) as unknown as BackendSecurity;
  } else {
    security = { ...DEFAULT_SECURITY };
  }
  if (auth === 'none') security = { ...security, authRateLimit: false, accountLockout: false };

  const swagger = await ask(
    flags.swagger,
    () =>
      select({
        message: 'Do you want Swagger/OpenAPI documentation?',
        default: previous?.swagger ?? true,
        choices: [
          { name: '1. Yes', value: true, description: 'Interactive docs at /api/docs, OpenAPI 3 JSON at /api/docs/openapi.json' },
          { name: '2. No', value: false },
        ],
      }),
    true,
    'Swagger',
    v => (v ? 'yes' : 'no'),
  );

  const installDependencies = flags.install && (interactive ? await confirm({ message: 'Install dependencies now (npm install)?', default: previous?.installDependencies ?? true }) : true);
  const initGit = flags.git && (interactive ? await confirm({ message: 'Initialize a git repository?', default: previous?.initGit ?? true }) : true);

  const options: BackendOptions = {
    appName,
    displayName: appName.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    projectDir: path.join(parentDir, appName),
    framework,
    architecture,
    database,
    orm,
    auth,
    hashing,
    swagger,
    security,
    installDependencies,
    initGit,
  };

  if (!interactive) return options;

  // Final confirmation
  log.title('Backend configuration');
  describeBackend(options).forEach(line => log.info(`  ${line}`));
  log.newline();
  const next = await select({
    message: 'Generate project with these settings?',
    choices: [
      { name: '1. Yes, generate', value: 'generate' as const },
      { name: '2. Go back and modify', value: 'modify' as const },
      { name: '3. Cancel', value: 'cancel' as const },
    ],
  });
  if (next === 'cancel') throw Object.assign(new Error('Cancelled'), { name: 'AbortPromptError' });
  if (next === 'modify') return collectBackendOptions({ ...flags, name: undefined }, options);
  return options;
}
