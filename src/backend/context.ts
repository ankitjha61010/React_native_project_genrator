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

/** Where the users feature lives in this architecture – docs/ARCHITECTURE.md walks through these files. */
function examplePaths(options: BackendOptions, arch: BackendArchitecture): Record<string, string> {
  const fw = options.framework;
  const nest = fw === 'nestjs';
  const strict = arch.id === 'clean' || arch.id === 'enterprise';
  const bootstrap = arch.dir('bootstrap', fw);
  const routesDir = arch.dir('routes', fw, 'users');
  return {
    PATH_CONTAINER: `${bootstrap}/container.ts`,
    PATH_APP: nest ? `${bootstrap}/app.setup.ts` : `${bootstrap}/app.ts`,
    PATH_APP_MODULE: `${bootstrap}/app.module.ts`,
    PATH_CORE_MODULE: `${bootstrap}/core.module.ts`,
    PATH_ROUTES_INDEX: routesDir === 'src/routes' ? 'src/routes/index.ts' : `${bootstrap}/routes.ts`,
    PATH_USERS_ROUTES: `${routesDir}/users.routes.ts`,
    PATH_USERS_CONTROLLER: `${arch.dir('http', fw, 'users')}/users.controller.ts`,
    PATH_USERS_SCHEMAS: `${arch.dir('dto', fw, 'users')}/users.${nest ? 'dto' : 'schemas'}.ts`,
    PATH_USERS_DOCS: `${arch.dir('docs', fw, 'users')}/users.docs.ts`,
    PATH_USERS_MESSAGES: `${arch.dir('messages', fw, 'users')}/users.messages.ts`,
    PATH_CORE_MESSAGES: `${arch.dir('core', fw)}/messages.ts`,
    PATH_USERS_SERVICE: `${arch.dir('application', fw, 'users')}/users.service.ts`,
    PATH_USERS_REPOSITORY: `${arch.dir('repositoryImpl', fw, 'users')}/${strict ? `${options.orm}-users` : 'users'}.repository.ts`,
    PATH_USERS_CONTRACT: `${arch.dir('repositoryContract', fw, 'users')}/users.repository.ts`,
    PATH_USERS_ENTITY: `${arch.dir('domain', fw, 'users')}/user.entity.ts`,
    PATH_USERS_MODULE: `${arch.dir('module', fw, 'users')}/users.module.ts`,
    PATH_ERRORS: `${arch.dir('core', fw)}/app-error.ts`,
  };
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
  const groupChat = chat && options.modules.groupChat;
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
    /** Group conversations: admins / members, name, image, add / remove members, leave. */
    GROUP_CHAT: groupChat,
    /** Direct chats only (no group columns, no member roles). */
    NO_GROUP_CHAT: chat && !groupChat,
    NOTIFICATIONS: notifications,
    AUDIO_CALL: hasAuth && options.modules.audioCall,
    VIDEO_CALL: hasAuth && options.modules.videoCall,
    HAS_CALLING: hasAuth && (options.modules.audioCall || options.modules.videoCall),
    CALLING: hasAuth && (options.modules.audioCall || options.modules.videoCall),
    /** User devices (FCM tokens) – part of push notifications. */
    DEVICES: notifications,
    /** Sign-in payloads carry the app's `device` (stored here, or forwarded to the notifications service). */
    DEVICE_INPUT: (notifications && role === undefined) || (role === 'identity' && Boolean(options.remoteDevices)),
    /** Identity service: sign-in devices are published to the notifications service. */
    DEVICE_EVENTS: role === 'identity' && Boolean(options.remoteDevices),
    /** GET /legal + Terms & Conditions / Privacy Policy pages (monolith / identity service). */
    LEGAL: options.modules.legal && !replica,
    /** The user may delete their own account (DELETE /users/me). */
    DELETE_ACCOUNT: hasAuth && options.modules.deleteAccount && !replica,
    /** Over-The-Air updates module (bundle checks, downloads, release management). */
    OTA: hasAuth && Boolean(options.modules.ota) && !replica,
    /** The Realtime port exists (chat events, live notifications, calling signaling). */
    REALTIME: chat || notifications || (hasAuth && (options.modules.audioCall || options.modules.videoCall)),
    /** This process hosts the Socket.IO server. */
    SOCKET_SERVER: (chat || notifications || (hasAuth && (options.modules.audioCall || options.modules.videoCall))) && role !== 'notifications',
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
    /** Redis: shared rate limits, Socket.IO adapter, cache helper (always on for microservices). */
    REDIS: options.redis || role !== undefined,
    /** Verification / OTP codes live in Redis (with a TTL) instead of a database table. */
    REDIS_CODES: (options.redis || role !== undefined) && (email || otp) && !replica,
    /** Verification / OTP codes are stored in the database. */
    DB_CODES: (email || otp) && !((options.redis || role !== undefined) && !replica),
    DOCKER: options.docker,
    /** This project has its own docker-compose.yml (microservices share one at the workspace root). */
    DOCKER_COMPOSE: options.docker && role === undefined,
    /**
     * Clean / Enterprise: interfaces (ports, repository contracts) in their own files and layers.
     * The other architectures keep an interface in the same file as its implementation.
     */
    STRICT: arch.id === 'clean' || arch.id === 'enterprise',
    SIMPLE: arch.id !== 'clean' && arch.id !== 'enterprise',
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
    MODULE_DEVICES: false,
    MODULE_NOTIFICATIONS: false,
    MODULE_CALLING: false,
    MODULE_LEGAL: false,
    MODULE_OTA: false,
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
    // Social sign-in keys (entered while generating, or empty – set them in .env later).
    GOOGLE_CLIENT_IDS_VALUE: [options.socialCredentials?.googleWebClientId, options.socialCredentials?.googleIosClientId].filter(Boolean).join(','),
    FACEBOOK_APP_ID_VALUE: options.socialCredentials?.facebookAppId ?? '',
    FACEBOOK_APP_SECRET_VALUE: options.socialCredentials?.facebookAppSecret ?? '',
    APPLE_CLIENT_IDS_VALUE: [options.appPackage, options.socialCredentials?.appleServiceId].filter(Boolean).join(','),
    // 32 / 16 characters, like the app's API_ENCRYPTION_KEY / API_ENCRYPTION_IV.
    API_ENCRYPTION_KEY: options.encryptionSecrets?.key ?? randomBytes(24).toString('base64url'),
    API_ENCRYPTION_IV: options.encryptionSecrets?.iv ?? randomBytes(12).toString('base64url'),
    // Push notifications & Agora calling
    FIREBASE_SERVICE_ACCOUNT_VALUE: options.firebaseServiceAccountPath ? './firebase-service-account.json' : '',
    AGORA_APP_ID_VALUE: options.agoraAppId ?? '',
    AGORA_APP_CERTIFICATE_VALUE: options.agoraAppCertificate ?? '',
  };

  Object.assign(variables, examplePaths(options, arch));
  return { options, arch, flags, variables };
}
