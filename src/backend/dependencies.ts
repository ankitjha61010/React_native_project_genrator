import type { BackendOptions } from './types.js';

/**
 * Exact versions of every package a generated backend may use. They were installed,
 * type-checked, linted, tested and started together – bump them together.
 */
export const BACKEND_VERSIONS: Record<string, string> = {
  // NestJS
  '@nestjs/common': '12.1.1',
  '@nestjs/core': '12.1.1',
  '@nestjs/platform-express': '12.1.1',
  '@nestjs/swagger': '12.0.2',
  '@nestjs/throttler': '6.7.1',
  '@nestjs/cli': '12.0.8',
  '@nestjs/schematics': '12.0.6',
  '@nestjs/testing': '12.1.1',
  'class-validator': '0.15.1',
  'class-transformer': '0.5.1',
  'reflect-metadata': '0.2.2',
  rxjs: '7.8.2',
  // Express
  express: '5.2.1',
  '@types/express': '5.0.6',
  cors: '2.8.6',
  '@types/cors': '2.8.19',
  'express-rate-limit': '8.7.0',
  'swagger-ui-express': '5.0.1',
  '@types/swagger-ui-express': '4.1.8',
  '@asteasolutions/zod-to-openapi': '9.1.0',
  // Shared runtime
  zod: '4.6.5',
  pino: '10.3.1',
  'pino-http': '11.0.0',
  helmet: '8.3.0',
  jsonwebtoken: '9.0.3',
  '@types/jsonwebtoken': '9.0.10',
  bcrypt: '6.0.0',
  '@types/bcrypt': '6.0.0',
  argon2: '0.45.1',
  // Databases
  prisma: '7.10.0',
  '@prisma/client': '7.10.0',
  '@prisma/adapter-pg': '7.10.0',
  '@prisma/adapter-mariadb': '7.10.0',
  typeorm: '1.1.1',
  pg: '8.23.0',
  mysql2: '3.24.4',
  mongoose: '9.10.2',
  // Tooling
  typescript: '6.0.3',
  '@types/node': '24.19.0',
  tsx: '4.23.15',
  vitest: '4.1.11',
  '@vitest/coverage-v8': '4.1.11',
  supertest: '7.3.0',
  '@types/supertest': '7.2.1',
  oxlint: '1.86.0',
  'oxlint-tsgolint': '7.0.2003',
  prettier: '3.9.9',
  'pino-pretty': '13.1.3',
};

export interface BackendDependencies {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

function pick(names: Iterable<string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of [...names].sort()) {
    const version = BACKEND_VERSIONS[name];
    if (!version) throw new Error(`No version pinned for "${name}".`);
    result[name] = version;
  }
  return result;
}

/** Only the packages the selected options use – nothing else ends up in package.json. */
export function resolveBackendDependencies(o: BackendOptions): BackendDependencies {
  const runtime = new Set<string>(['zod', 'pino', 'pino-http']);
  const dev = new Set<string>(['typescript', '@types/node', 'tsx', 'vitest', '@vitest/coverage-v8', 'supertest', '@types/supertest', 'oxlint', 'oxlint-tsgolint', 'prettier', 'pino-pretty']);
  const add = (set: Set<string>, ...names: string[]) => names.forEach(n => set.add(n));
  const auth = o.auth !== 'none';
  const s = o.security;

  if (o.framework === 'nestjs') {
    add(runtime, '@nestjs/common', '@nestjs/core', '@nestjs/platform-express', 'reflect-metadata', 'rxjs', 'class-validator', 'class-transformer');
    add(dev, '@nestjs/cli', '@nestjs/schematics', '@nestjs/testing', '@types/express');
    if (o.swagger) add(runtime, '@nestjs/swagger');
    if (s.rateLimit || (auth && s.authRateLimit)) add(runtime, '@nestjs/throttler');
  } else {
    add(runtime, 'express');
    add(dev, '@types/express');
    if (s.cors) add(runtime, 'cors'), add(dev, '@types/cors');
    if (s.rateLimit || (auth && s.authRateLimit)) add(runtime, 'express-rate-limit');
    if (o.swagger) add(runtime, 'swagger-ui-express', '@asteasolutions/zod-to-openapi'), add(dev, '@types/swagger-ui-express');
  }

  if (s.helmet) add(runtime, 'helmet');

  if (auth) {
    add(runtime, 'jsonwebtoken');
    add(dev, '@types/jsonwebtoken');
    if (o.hashing === 'bcrypt' || o.hashing === 'configurable') add(runtime, 'bcrypt'), add(dev, '@types/bcrypt');
    if (o.hashing === 'argon2' || o.hashing === 'configurable') add(runtime, 'argon2');
  }

  switch (o.orm) {
    case 'prisma':
      add(runtime, '@prisma/client', o.database === 'mysql' ? '@prisma/adapter-mariadb' : '@prisma/adapter-pg');
      add(dev, 'prisma');
      break;
    case 'typeorm':
      add(runtime, 'typeorm', 'reflect-metadata', o.database === 'mysql' ? 'mysql2' : 'pg');
      break;
    case 'mongoose':
      add(runtime, 'mongoose');
      break;
  }

  return { dependencies: pick(runtime), devDependencies: pick(dev) };
}
