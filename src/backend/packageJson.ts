import type { BackendRenderContext } from './context.js';
import { resolveBackendDependencies } from './dependencies.js';

/** package.json of the generated backend – scripts depend on framework + ORM. */
export function buildBackendPackageJson(ctx: BackendRenderContext): Record<string, unknown> {
  const { options, variables } = ctx;
  const deps = resolveBackendDependencies(options);
  const nest = options.framework === 'nestjs';
  const dataSource = `${ctx.arch.dir('database', options.framework)}/data-source.ts`;

  const scripts: Record<string, string> = nest
    ? {
        build: 'nest build',
        dev: 'nest start --watch',
        start: `node ${variables.ENTRY_JS}`,
        'start:debug': 'nest start --debug --watch',
      }
    : {
        build: 'tsc -p tsconfig.build.json',
        dev: `tsx watch ${variables.ENTRY_TS}`,
        start: `node ${variables.ENTRY_JS}`,
      };

  Object.assign(scripts, {
    typecheck: 'tsc --noEmit',
    lint: 'oxlint --type-aware src test',
    'lint:fix': 'oxlint --type-aware --fix src test',
    format: 'prettier --write .',
    'format:check': 'prettier --check .',
    test: 'vitest run',
    'test:watch': 'vitest',
    'test:e2e': 'vitest run --config vitest.config.e2e.ts',
    'test:all': 'npm test && npm run test:e2e',
    'test:cov': 'vitest run --coverage',
  });

  // Replica services (microservices) get their users from the identity service.
  const seeds = options.service !== 'chat' && options.service !== 'notifications';
  switch (options.orm) {
    case 'prisma':
      Object.assign(scripts, {
        // The Prisma client is generated into src/generated (git-ignored).
        postinstall: 'prisma generate',
        prebuild: 'prisma generate',
        'db:generate': 'prisma generate',
        'db:migrate': 'prisma migrate dev',
        'db:deploy': 'prisma migrate deploy',
        ...(seeds ? { 'db:seed': 'prisma db seed' } : {}),
        'db:reset': 'prisma migrate reset',
        'db:studio': 'prisma studio',
      });
      break;
    case 'typeorm':
      Object.assign(scripts, {
        typeorm: 'tsx ./node_modules/typeorm/cli.js',
        'db:migrate': `npm run typeorm -- migration:run -d ${dataSource}`,
        'db:deploy': `npm run typeorm -- migration:run -d ${dataSource}`,
        'db:revert': `npm run typeorm -- migration:revert -d ${dataSource}`,
        'db:migration:generate': `npm run typeorm -- migration:generate -d ${dataSource}`,
        ...(seeds ? { 'db:seed': `tsx ${variables.SEED_TS}` } : {}),
      });
      break;
    case 'mongoose':
      if (seeds) Object.assign(scripts, { 'db:seed': `tsx ${variables.SEED_TS}` });
      break;
  }

  return {
    name: variables.APP_SLUG,
    version: '0.1.0',
    description: `${options.displayName} API (${variables.FRAMEWORK_NAME}, ${variables.ARCHITECTURE_NAME})`,
    private: true,
    license: 'UNLICENSED',
    type: 'module',
    engines: { node: '>=22.13.0' },
    scripts,
    dependencies: deps.dependencies,
    devDependencies: deps.devDependencies,
  };
}
