import { randomBytes } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { step } from '../cli/logger.js';
import { initGit } from '../generators/gitGenerator.js';
import { run } from '../utils/exec.js';
import { TEMPLATES_DIR } from '../utils/paths.js';
import { renderTemplate } from '../utils/templateEngine.js';
import { DATABASE_LABELS, devDatabaseUrl, FRAMEWORK_LABELS } from './context.js';
import { BACKEND_VERSIONS } from './dependencies.js';
import { generateBackend, type BackendSummary } from './generator.js';
import type { BackendOptions, ServiceRole } from './types.js';

/** Where each service listens (the gateway is the only public port). */
export const SERVICE_PORTS: Record<ServiceRole | 'gateway', number> = { gateway: 3000, identity: 3001, chat: 3002, notifications: 3003 };

export interface MicroservicesPlan {
  rootDir: string;
  services: BackendOptions[];
  chat: boolean;
  notifications: boolean;
}

/** One backend options object per service – each is generated like a (smaller) monolith. */
export function planMicroservices(base: BackendOptions): MicroservicesPlan {
  const slug = base.appName.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const shared = { sharedJwtSecret: randomBytes(48).toString('base64url'), sharedName: slug, initGit: false };
  const service = (role: ServiceRole, overrides: Partial<BackendOptions>): BackendOptions => ({
    ...base,
    ...shared,
    ...overrides,
    appName: `${slug}-${role}`,
    displayName: `${base.displayName} ${role[0]!.toUpperCase()}${role.slice(1)}`,
    projectDir: path.join(base.projectDir, 'services', role),
    service: role,
    port: SERVICE_PORTS[role],
  });
  const none = { email: false, mobileOtp: false, google: false, facebook: false, apple: false };
  const chat = base.modules.chat;
  const notifications = base.modules.notifications;
  return {
    rootDir: base.projectDir,
    chat,
    notifications,
    services: [
      // Accounts, sign-in, profiles.
      service('identity', { modules: { chat: false, notifications: false } }),
      // Only verifies access tokens (no sign-in of its own) – plain JWT, no refresh tokens.
      ...(chat ? [service('chat', { auth: 'jwt', authMethods: none, hashing: 'none', modules: { chat: true, notifications: false }, remotePush: notifications })] : []),
      ...(notifications ? [service('notifications', { auth: 'jwt', authMethods: none, hashing: 'none', modules: { chat: false, notifications: true } })] : []),
    ],
  };
}

function pick(names: string[]): Record<string, string> {
  return Object.fromEntries(names.sort().map(name => [name, BACKEND_VERSIONS[name]!]));
}

async function renderGatewayFile(template: string, flags: Record<string, boolean>): Promise<string> {
  const source = await fs.readFile(path.join(TEMPLATES_DIR, 'backend/gateway', template), 'utf8');
  return renderTemplate(source, { flags, variables: {}, resolveImport: id => id, resolveSymbol: id => id }, `backend/gateway/${template}`).replace(/\n{3,}/g, '\n\n');
}

async function writeGateway(plan: MicroservicesPlan, base: BackendOptions): Promise<void> {
  const dir = path.join(plan.rootDir, 'gateway');
  const flags = { CHAT: plan.chat, NOTIFICATIONS: plan.notifications };
  await fs.outputFile(path.join(dir, 'src/gateway.ts'), await renderGatewayFile('gateway.ts', flags));
  await fs.outputFile(path.join(dir, 'src/server.ts'), await renderGatewayFile('server.ts', flags));
  await fs.outputFile(path.join(dir, 'test/gateway.e2e-spec.ts'), await renderGatewayFile('gateway.e2e-spec.ts', flags));
  const env = [
    'PORT=3000',
    'LOG_LEVEL=info',
    `IDENTITY_URL=http://localhost:${SERVICE_PORTS.identity}`,
    ...(plan.chat ? [`CHAT_URL=http://localhost:${SERVICE_PORTS.chat}`] : []),
    ...(plan.notifications ? [`NOTIFICATIONS_URL=http://localhost:${SERVICE_PORTS.notifications}`] : []),
  ].join('\n');
  await fs.outputFile(path.join(dir, '.env'), `${env}\n`);
  await fs.outputFile(path.join(dir, '.env.example'), `${env}\n`);
  await fs.outputFile(path.join(dir, '.gitignore'), 'node_modules/\ndist/\n.env\n');
  await fs.outputJson(
    path.join(dir, 'tsconfig.json'),
    {
      compilerOptions: {
        module: 'nodenext',
        moduleResolution: 'nodenext',
        target: 'ES2023',
        strict: true,
        skipLibCheck: true,
        outDir: 'dist',
        rootDir: '.',
        noUnusedLocals: true,
        types: ['vitest/globals', 'node'],
      },
      include: ['src', 'test'],
    },
    { spaces: 2 },
  );
  await fs.outputFile(path.join(dir, 'vitest.config.ts'), "import { defineConfig } from 'vitest/config';\n\nexport default defineConfig({ test: { globals: true, include: ['test/**/*.e2e-spec.ts'], env: { LOG_LEVEL: 'silent' } } });\n");
  await fs.outputJson(
    path.join(dir, 'package.json'),
    {
      name: `${base.appName.toLowerCase()}-gateway`,
      version: '0.1.0',
      private: true,
      type: 'module',
      engines: { node: '>=22.13.0' },
      scripts: { dev: 'tsx watch src/server.ts', build: 'tsc -p tsconfig.json', start: 'node dist/src/server.js', typecheck: 'tsc --noEmit', test: 'vitest run' },
      dependencies: pick(['express', 'http-proxy-middleware', 'pino']),
      devDependencies: pick([
        'typescript',
        'tsx',
        '@types/express',
        '@types/node',
        'vitest',
        'supertest',
        '@types/supertest',
        'pino-pretty',
        ...(plan.chat ? ['socket.io', 'socket.io-client'] : []),
      ]),
    },
    { spaces: 2 },
  );
}

function dockerCompose(base: BackendOptions): string {
  const db =
    base.database === 'postgresql'
      ? `  db:
    image: postgres:17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - '5432:5432'
    volumes:
      - db-data:/var/lib/postgresql/data
      # One database per service.
      - ./docker/init-databases.sql:/docker-entrypoint-initdb.d/init-databases.sql:ro`
      : base.database === 'mysql'
        ? `  db:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: root
    ports:
      - '3306:3306'
    volumes:
      - db-data:/var/lib/mysql
      # One database per service.
      - ./docker/init-databases.sql:/docker-entrypoint-initdb.d/init-databases.sql:ro`
        : `  db:
    image: mongo:8
    ports:
      - '27017:27017'
    volumes:
      - db-data:/data/db`;
  return `# Development infrastructure: the database server (one database per service) + Redis (events).
services:
${db}
  redis:
    image: redis:8
    ports:
      - '6379:6379'

volumes:
  db-data:
`;
}

function initDatabasesSql(plan: MicroservicesPlan, base: BackendOptions): string | null {
  if (base.database === 'mongodb') return null; // MongoDB creates databases on first write.
  const names = plan.services.map(s => new URL(devDatabaseUrl(s)).pathname.slice(1));
  return `${names.map(name => (base.database === 'postgresql' ? `CREATE DATABASE ${name};` : `CREATE DATABASE IF NOT EXISTS ${name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`)).join('\n')}\n`;
}

function rootReadme(plan: MicroservicesPlan, base: BackendOptions): string {
  const rows = [
    `| \`gateway/\` | ${SERVICE_PORTS.gateway} | The only public entry point: routes \`/api/v1/*\`${plan.chat ? ' and Socket.IO' : ''} to the services, \`/api/v1/health\` checks all of them |`,
    `| \`services/identity/\` | ${SERVICE_PORTS.identity} | Accounts, sign-in, tokens, profiles (\`/auth\`, \`/users\`). Publishes user changes |`,
    ...(plan.chat ? [`| \`services/chat/\` | ${SERVICE_PORTS.chat} | Conversations, messages, uploads, **Socket.IO** (\`/chat\`) |`] : []),
    ...(plan.notifications ? [`| \`services/notifications/\` | ${SERVICE_PORTS.notifications} | Push devices, inbox, broadcasts (\`/notifications\`) |`] : []),
  ];
  return `# ${base.displayName} – microservices

${FRAMEWORK_LABELS[base.framework]} services · ${DATABASE_LABELS[base.database]} (one database per service) · Redis events.

| Folder | Port | What |
| --- | --- | --- |
${rows.join('\n')}

Clients use **one URL**: \`http://localhost:3000/api/v1\` – the same API as the monolith (see
services/identity/docs/API.md and the other services' docs/API.md).

## How the services work together

- **Tokens:** the identity service signs access tokens; every service verifies them itself (same \`JWT_ACCESS_SECRET\`,
  issuer and audience in each \`.env\`) – no call to the identity service per request.
- **Users:** the identity service publishes \`user.upserted\` / \`user.deleted\` on Redis (channel \`users\`).${plan.chat || plan.notifications ? ' The other\n  services keep a local copy (names, avatars, roles, token version – never password hashes).' : ''}
${plan.chat && plan.notifications ? '- **Chat → notifications:** members who are offline get a push: chat publishes `push`, notifications sends it.\n- **Notifications → apps:** live `notification:new` events go to the chat service (it holds the sockets) on channel `realtime`.\n' : ''}- Redis pub/sub is fire-and-forget. For events that must never be lost, move to Redis Streams or a queue.

## Run it

\`\`\`sh
docker compose up -d          # database server + Redis
npm install                   # root tools (concurrently)
npm run install:all           # every service + the gateway
npm run setup                 # migrations${base.orm === 'mongoose' ? '' : ' + seed'}
npm run dev                   # gateway + all services, one terminal
\`\`\`

Or one at a time: \`cd services/identity && npm run dev\` (each service has its own README).

| Script | What |
| --- | --- |
| \`npm run dev\` | All services + gateway (watch mode) |
| \`npm run test\` | Tests of every service and the gateway |
| \`npm run typecheck\` | Type check everything |
`;
}

async function writeRoot(plan: MicroservicesPlan, base: BackendOptions): Promise<void> {
  const dirs = [...plan.services.map(s => path.relative(plan.rootDir, s.projectDir)), 'gateway'];
  const each = (command: string, only = dirs) => only.map(dir => `npm --prefix ${dir} ${command}`).join(' && ');
  const identity = path.relative(plan.rootDir, plan.services[0]!.projectDir);
  const setup = [
    ...(base.orm === 'mongoose' ? [] : plan.services.map(s => `npm --prefix ${path.relative(plan.rootDir, s.projectDir)} run db:deploy`)),
    `npm --prefix ${identity} run db:seed`,
  ].join(' && ');
  await fs.outputJson(
    path.join(plan.rootDir, 'package.json'),
    {
      name: `${base.appName.toLowerCase()}-microservices`,
      private: true,
      scripts: {
        'install:all': each('install'),
        setup,
        dev: `concurrently -k -n ${dirs.map(d => path.basename(d)).join(',')} ${dirs.map(d => `"npm --prefix ${d} run dev"`).join(' ')}`,
        test: each('test') + ' && ' + plan.services.map(s => `npm --prefix ${path.relative(plan.rootDir, s.projectDir)} run test:e2e`).join(' && '),
        typecheck: each('run typecheck'),
      },
      devDependencies: pick(['concurrently']),
    },
    { spaces: 2 },
  );
  await fs.outputFile(path.join(plan.rootDir, 'docker-compose.yml'), dockerCompose(base));
  const sql = initDatabasesSql(plan, base);
  if (sql) await fs.outputFile(path.join(plan.rootDir, 'docker/init-databases.sql'), sql);
  await fs.outputFile(path.join(plan.rootDir, 'README.md'), rootReadme(plan, base));
  await fs.outputFile(path.join(plan.rootDir, '.gitignore'), 'node_modules/\n.DS_Store\n*.log\n');
}

/** Paths of every file that would be written (dry run). */
export function describeMicroservices(plan: MicroservicesPlan): string[] {
  return [
    `gateway/                 :${SERVICE_PORTS.gateway}  (public)`,
    ...plan.services.map(s => `services/${s.service?.padEnd(14)}  :${s.port}  ${s.service === 'identity' ? 'auth + users' : s.service}`),
    'docker-compose.yml       database server + Redis',
  ];
}

export async function generateMicroservices(base: BackendOptions): Promise<{ plan: MicroservicesPlan; summaries: BackendSummary[]; warnings: string[] }> {
  const plan = planMicroservices(base);
  await step('Writing workspace + gateway', async () => {
    await writeRoot(plan, base);
    await writeGateway(plan, base);
  }, 'Workspace + API gateway written');

  const summaries: BackendSummary[] = [];
  for (const service of plan.services) summaries.push(await generateBackend(service));
  const warnings = summaries.flatMap(s => s.warnings);

  if (base.installDependencies) {
    await step(
      'Installing gateway + workspace dependencies',
      async () => {
        await run('npm', ['install', '--no-audit', '--no-fund'], { cwd: path.join(plan.rootDir, 'gateway') });
        await run('npm', ['install', '--no-audit', '--no-fund'], { cwd: plan.rootDir });
      },
      'Gateway dependencies installed',
    ).catch(() => warnings.push('Gateway dependencies are NOT installed – run `npm install` in gateway/ and the root.'));
  }
  if (base.initGit) {
    const result = await initGit(plan.rootDir).catch(() => 'unavailable' as const);
    if (result === 'unavailable') warnings.push('git was not found, the repository was not initialized.');
  }
  return { plan, summaries, warnings };
}
