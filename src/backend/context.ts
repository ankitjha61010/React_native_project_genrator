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
  const slug = options.appName.toLowerCase().replace(/[^a-z0-9-]+/g, '-');

  const flags: Record<string, boolean> = {
    NEST: options.framework === 'nestjs',
    EXPRESS: options.framework === 'express',
    STYLE_SERVICE: arch.style === 'service',
    STYLE_USECASE: arch.style === 'usecase',
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
    HASH_BCRYPT: hasAuth && options.hashing === 'bcrypt',
    HASH_ARGON2: hasAuth && options.hashing === 'argon2',
    HASH_CONFIGURABLE: hasAuth && options.hashing === 'configurable',
    SWAGGER: options.swagger,
    SEC_HELMET: s.helmet,
    SEC_CORS: s.cors,
    SEC_RATE_LIMIT: s.rateLimit,
    SEC_AUTH_RATE_LIMIT: hasAuth && s.authRateLimit,
    SEC_ANY_RATE_LIMIT: s.rateLimit || (hasAuth && s.authRateLimit),
    SEC_BODY_LIMIT: s.bodyLimit,
    SEC_SANITIZE: s.sanitize,
    SEC_LOCKOUT: hasAuth && s.accountLockout,
    // Filled per render of the env template.
    ENV_EXAMPLE: false,
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
    /** `.execute` for use-case style – controllers call `this.auth.login{{CALL}}(…)`. */
    CALL: arch.style === 'usecase' ? '.execute' : '',
    SEED_TS: `${arch.dir('database', options.framework)}/seed.ts`,
    JWT_ACCESS_SECRET: secret(),
    JWT_REFRESH_SECRET: secret(),
  };

  return { options, arch, flags, variables };
}
