import { randomBytes } from 'node:crypto';
import { getBackendArchitecture, type BackendArchitecture } from './architectures.js';
import type { BackendContext } from './manifest.js';
import type { BackendOptions } from './types.js';

export const FRAMEWORK_LABELS = { nestjs: 'NestJS', express: 'Express.js + Node.js' } as const;
export const DATABASE_LABELS = { postgresql: 'PostgreSQL', mysql: 'MySQL', mongodb: 'MongoDB' } as const;
export const ORM_LABELS = { prisma: 'Prisma', typeorm: 'TypeORM', mongoose: 'Mongoose' } as const;
export const AUTH_LABELS = {
  none: 'No authentication',
  jwt: 'JWT (access token)',
  'access-refresh': 'Access token + Refresh token',
  'refresh-rotation': 'JWT + Refresh token + Rotation',
} as const;
export const HASHING_LABELS = {
  bcrypt: 'bcrypt',
  argon2: 'Argon2 (argon2id)',
  configurable: 'Configurable (bcrypt or Argon2 via PASSWORD_HASH_ALGORITHM)',
  none: 'No password hashing',
} as const;

export interface BackendRenderContext extends BackendContext {
  flags: Record<string, boolean>;
  variables: Record<string, string>;
}

/** `my-app` → `my_app` (database names can't contain dashes everywhere). */
function dbName(slug: string): string {
  return slug.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'app';
}

function secret(): string {
  return randomBytes(48).toString('base64url');
}

export function devDatabaseUrl(options: BackendOptions, name = dbName(options.appName.toLowerCase())): string {
  switch (options.database) {
    case 'postgresql':
      return `postgresql://postgres:postgres@localhost:5432/${name}?schema=public`;
    case 'mysql':
      return `mysql://root:root@localhost:3306/${name}`;
    case 'mongodb':
      return `mongodb://localhost:27017/${name}`;
  }
}

export function prepareBackendContext(options: BackendOptions): BackendRenderContext {
  const arch: BackendArchitecture = getBackendArchitecture(options.architecture);
  const s = options.security;
  const hasAuth = options.auth !== 'none';
  const m = options.authMethods;
  const email = hasAuth && m.email;
  const otp = hasAuth && m.mobileOtp;
  const social = hasAuth && (m.google || m.facebook || m.apple);
  const chat = hasAuth && options.modules.chat;
  const notifications = hasAuth && options.modules.notifications;
  const role = options.service;
  const replica = role === 'chat' || role === 'notifications';
  const slug = options.appName.toLowerCase().replace(/[^a-z0-9-]+/g, '-');

  const flags: Record<string, boolean> = {
    NEST: options.framework === 'nestjs',
    EXPRESS: options.framework === 'express',
    VIEWS: arch.views,
    FEATURE_MODULES: arch.featureModules,
    MODULE_FACTORIES: options.framework === 'express' && arch.id === 'modular',
    PRISMA: options.orm === 'prisma',
    TYPEORM: options.orm === 'typeorm',
    MONGOOSE: options.orm === 'mongoose',
    POSTGRES: options.database === 'postgresql',
    MYSQL: options.database === 'mysql',
    MONGO: options.database === 'mongodb',
    SQL: options.database !== 'mongodb',
    AUTH: hasAuth,
    NO_AUTH: !hasAuth,
    AUTH_JWT_ONLY: options.auth === 'jwt',
    AUTH_REFRESH: options.auth === 'access-refresh' || options.auth === 'refresh-rotation',
    AUTH_ROTATION: options.auth === 'refresh-rotation',
    // Sign-in methods
    AUTH_EMAIL: email,
    AUTH_OTP: otp,
    SOCIAL: social,
    SOCIAL_GOOGLE: hasAuth && m.google,
    SOCIAL_FACEBOOK: hasAuth && m.facebook,
    SOCIAL_APPLE: hasAuth && m.apple,
    /** Accounts without email / password exist (mobile or social sign-in). */
    PASSWORDLESS: otp || social,
    /** 6-digit codes by email / SMS. */
    CODES: email || otp,
    // Password hashing (only email + password accounts have a password)
    HASH_BCRYPT: email && options.hashing === 'bcrypt',
    HASH_ARGON2: email && options.hashing === 'argon2',
    HASH_CONFIGURABLE: email && options.hashing === 'configurable',
    // Feature modules
    CHAT: chat,
    NOTIFICATIONS: notifications,
    /** The Realtime port exists (chat events, live notifications). */
    REALTIME: chat || notifications,
    /** This process hosts the Socket.IO server (not the notifications service – it publishes events). */
    SOCKET_SERVER: (chat || notifications) && role !== 'notifications',
    // ── microservices ──
    MICROSERVICE: role !== undefined,
    SVC_IDENTITY: role === 'identity',
    SVC_CHAT: role === 'chat',
    SVC_NOTIFICATIONS: role === 'notifications',
    /** Redis event bus between services. */
    EVENTS: role !== undefined,
    /** Auth routes + AuthService (monolith / identity service). */
    AUTH_API: hasAuth && !replica,
    /** Users routes + UsersService (monolith / identity service). */
    USERS_API: !replica,
    /** Users are a local copy synced from the identity service. */
    REPLICA: replica,
    /** Chat pushes through the notifications service (events). */
    PUSH_EVENTS: role === 'chat' && Boolean(options.remotePush),
    /** Nest lifecycle needs the infrastructure (sockets / event bus to close). */
    INFRA_LIFECYCLE: ((chat || notifications) && role !== 'notifications') || role !== undefined,
    /** Chat pushes offline members (in-process notifications, or the notifications service). */
    CHAT_PUSH: notifications || (role === 'chat' && Boolean(options.remotePush)),
    /** Realtime events are sent to the chat service's sockets. */
    REALTIME_EVENTS: role === 'notifications',
    /** File uploads (avatars, chat media) on local disk. */
    UPLOADS: hasAuth && role !== 'notifications',
    API_ENCRYPTION: options.apiEncryption,
    /** env.ts needs its comma-separated list parser. */
    ENV_LIST: s.cors || (hasAuth && (m.google || m.apple)),
    SWAGGER: options.swagger,
    SEC_HELMET: s.helmet,
    SEC_CORS: s.cors,
    SEC_RATE_LIMIT: s.rateLimit,
    SEC_AUTH_RATE_LIMIT: hasAuth && s.authRateLimit,
    SEC_ANY_RATE_LIMIT: s.rateLimit || (hasAuth && s.authRateLimit),
    SEC_BODY_LIMIT: s.bodyLimit,
    SEC_SANITIZE: s.sanitize,
    // Lockout protects passwords – only with email + password sign-in.
    SEC_LOCKOUT: email && s.accountLockout,
    // Set per file (manifest `flags`).
    ENV_EXAMPLE: false,
    MODULE_HEALTH: false,
    MODULE_AUTH: false,
    MODULE_USERS: false,
    MODULE_CHAT: false,
    MODULE_NOTIFICATIONS: false,
  };
  for (const a of ['feature-based', 'layered', 'clean', 'mvc', 'modular', 'enterprise']) {
    flags[`ARCH_${a.replace(/-/g, '_').toUpperCase()}`] = arch.id === a;
  }

  const variables: Record<string, string> = {
    APP_NAME: options.appName,
    APP_SLUG: slug,
    DISPLAY_NAME: options.displayName,
    DB_NAME: dbName(slug),
    DATABASE_URL: devDatabaseUrl(options),
    FRAMEWORK_NAME: FRAMEWORK_LABELS[options.framework],
    DATABASE_LABEL: DATABASE_LABELS[options.database],
    ORM_NAME: ORM_LABELS[options.orm],
    AUTH_NAME: AUTH_LABELS[options.auth],
    HASHING_NAME: HASHING_LABELS[options.hashing],
    ARCHITECTURE_NAME: arch.name,
    ARCHITECTURE_SUMMARY: arch.summary,
    ARCHITECTURE_TREE: arch.preview(options.framework),
    ARCHITECTURE_RULES: ['| Question | Answer |', '| --- | --- |', ...arch.rules.map(r => `| ${r.question} | ${r.answer} |`)].join('\n'),
    ARCHITECTURE_CONCEPTS: arch.concepts.map(c => `### ${c.title}\n\n${c.body}`).join('\n\n'),
    NEST_ENTRY: `${arch.dir('bootstrap', options.framework).replace(/^src\/?/, '')}${arch.dir('bootstrap', options.framework) === 'src' ? '' : '/'}main`,
    ENTRY_JS: `dist/${arch.dir('bootstrap', options.framework).replace(/^src\/?/, '')}${arch.dir('bootstrap', options.framework) === 'src' ? '' : '/'}${options.framework === 'nestjs' ? 'main' : 'server'}.js`,
    ENTRY_TS: `${arch.dir('bootstrap', options.framework)}/${options.framework === 'nestjs' ? 'main' : 'server'}.ts`,
    SEED_TS: `${arch.dir('database', options.framework)}/seed.ts`,
    JWT_ACCESS_SECRET: options.sharedJwtSecret ?? secret(),
    JWT_REFRESH_SECRET: secret(),
    APP_PACKAGE: options.appPackage,
    PORT: String(options.port ?? 3000),
    /** Every service must accept the identity service's tokens. */
    JWT_ISSUER: options.sharedName ?? slug,
    TRUST_PROXY: String(role !== undefined),
    SERVICE_NAME: role ?? 'api',
    /** Prisma native type of uuid columns. */
    UUID: options.database === 'postgresql' ? '@db.Uuid' : '@db.Char(36)',
    AUTH_METHODS_TEXT: [email && 'email + password', otp && 'mobile number + SMS code', hasAuth && m.google && 'Google', hasAuth && m.facebook && 'Facebook', hasAuth && m.apple && 'Apple'].filter(Boolean).join(', '),
    CODE_PURPOSES: [...(email ? ['email_verification', 'password_reset'] : []), ...(otp ? ['phone_login'] : [])].map(p => `'${p}'`).join(' | ') || 'never',
    SOCIAL_PROVIDERS_TEXT: (['Google', 'Facebook', 'Apple'] as const).filter(p => hasAuth && m[p.toLowerCase() as 'google']).join(' / '),
    /** First enabled provider, as a literal (tests). */
    SOCIAL_PROVIDER: `'${(['google', 'facebook', 'apple'] as const).find(p => m[p]) ?? 'google'}'`,
    SOCIAL_PROVIDER_LIST: (['google', 'facebook', 'apple'] as const).filter(p => hasAuth && m[p]).map(p => `'${p}'`).join(', '),
    // 32 / 16 characters, like the app's API_ENCRYPTION_KEY / API_ENCRYPTION_IV.
    API_ENCRYPTION_KEY: options.encryptionSecrets?.key ?? randomBytes(24).toString('base64url'),
    API_ENCRYPTION_IV: options.encryptionSecrets?.iv ?? randomBytes(12).toString('base64url'),
  };

  return { options, arch, flags, variables };
}
