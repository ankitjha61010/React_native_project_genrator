import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs-extra';
import { generateBackend } from '../backend/generator.js';
import { generateMicroservices } from '../backend/microservices.js';
import { collectBackendOptions, describeBackend, type BackendPreset } from '../backend/prompts.js';
import type { BackendOptions } from '../backend/types.js';
import { DATABASE_LABELS, devDatabaseUrl, FRAMEWORK_LABELS } from '../backend/context.js';
import type { CliFlags } from '../cli/args.js';
import { log } from '../cli/logger.js';
import { collectOptions } from '../cli/prompts.js';
import { socialProviders } from '../config/socialAuth.js';
import type { ProjectOptions } from '../core/types.js';
import { initGit } from '../generators/gitGenerator.js';
import { generateProject } from '../generators/projectGenerator.js';

export interface FullstackOptions {
  /** `<parent>/<AppName>` – holds `mobile/` and `backend/`. */
  rootDir: string;
  frontend: ProjectOptions;
  backend: BackendOptions;
  /** One git repository at the root (the projects don't get their own). */
  initGit: boolean;
}

/** The URL the app uses in development (the app maps localhost to 10.0.2.2 on the Android emulator). */
export const DEV_API_URL = 'http://localhost:3000/api/v1';

/** What the app's choices mean for the backend. */
function presetFor(frontend: ProjectOptions, rootDir: string): BackendPreset {
  const social = socialProviders(frontend.socialAuth);
  const slug = frontend.appName.toLowerCase();
  return {
    appName: `${slug}-api`,
    displayName: frontend.displayName,
    projectDir: path.join(rootDir, 'backend'),
    // The app's login screen always has email + password.
    authMethods: { email: true, mobileOtp: frontend.authMobile, google: social.google, facebook: social.facebook, apple: social.apple },
    modules: { chat: frontend.chat, notifications: frontend.notifications },
    apiEncryption: frontend.apiEncryption,
    appPackage: frontend.packageName,
    installDependencies: frontend.installDependencies,
    // One repository for both projects (created at the root).
    initGit: false,
  };
}

export function describeFullstack(o: FullstackOptions): string[] {
  const f = o.frontend;
  return [
    chalk.bold(`${f.displayName} → ${o.rootDir}`),
    `  mobile/   React Native (${f.architecture}, ${f.stateManagement}) – talks to ${DEV_API_URL}`,
    `  backend/  ${FRAMEWORK_LABELS[o.backend.framework]} + ${DATABASE_LABELS[o.backend.database]}${o.backend.deployment === 'microservices' ? ' – gateway + services' : ''}`,
    '',
    ...describeBackend(o.backend).map(line => `  ${line}`),
  ];
}

/** App questions first; then only the backend questions the app doesn't already answer. */
export async function collectFullstackOptions(flags: CliFlags): Promise<FullstackOptions> {
  const app = await collectOptions(flags);
  const rootDir = path.join(app.parentDir, app.appName);
  const secrets = app.apiEncryption ? { key: randomBytes(24).toString('base64url'), iv: randomBytes(12).toString('base64url') } : undefined;
  const frontend: ProjectOptions = {
    ...app,
    parentDir: rootDir,
    directoryName: 'mobile',
    apiBaseUrl: DEV_API_URL,
    apiEncryptionSecrets: secrets,
    initGit: false,
  };

  log.title('Backend');
  const backend: BackendOptions = { ...(await collectBackendOptions({ ...flags, name: undefined }, undefined, presetFor(frontend, rootDir))), encryptionSecrets: secrets };
  const options: FullstackOptions = { rootDir, frontend, backend, initGit: app.initGit };

  if (!flags.yes) {
    log.title('Frontend + Backend');
    describeFullstack(options).forEach(line => log.info(line));
    log.newline();
    const next = await select({
      message: 'Generate both projects with these settings?',
      choices: [
        { name: '1. Yes, generate', value: 'generate' as const },
        { name: '2. Cancel', value: 'cancel' as const },
      ],
    });
    if (next === 'cancel') throw Object.assign(new Error('Cancelled'), { name: 'AbortPromptError' });
  }
  return options;
}

function microRun(b: BackendOptions): string {
  return `\`\`\`sh
# 1. Database server (one database per service) + Redis
docker compose -f backend/docker-compose.yml up -d

# 2. Backend – API gateway http://localhost:3000/api/v1 + ${['identity', ...(b.modules.chat ? ['chat'] : []), ...(b.modules.notifications ? ['notifications'] : [])].join(' / ')} services
cd backend
npm install && npm run install:all
npm run setup              # ${b.orm === 'mongoose' ? 'seed' : 'migrations + seed'} (administrator from SEED_ADMIN_* in services/identity/.env)
npm run dev                # gateway + every service

# 3. App (another terminal)
cd mobile
npm start
npm run android            # or: npm run ios
\`\`\``;
}

function rootReadme(o: FullstackOptions): string {
  const b = o.backend;
  const db = DATABASE_LABELS[b.database];
  const migrate = b.orm === 'mongoose' ? '' : '\nnpm run db:deploy          # create the tables\n';
  const monolithRun = `\`\`\`sh
# 1. Database (${db}) – or point backend/.env DATABASE_URL at your own
docker compose up -d db

# 2. Backend – http://localhost:3000/api/v1${b.swagger ? ' · docs http://localhost:3000/api/docs' : ''}
cd backend
npm install${migrate}npm run db:seed            # administrator from SEED_ADMIN_* in backend/.env
npm run dev

# 3. App (another terminal)
cd mobile
npm start
npm run android            # or: npm run ios
\`\`\``;
  return `# ${o.frontend.displayName}

| Folder | What |
| --- | --- |
| \`mobile/\` | React Native app – see [mobile/README.md](mobile/README.md) |
| \`backend/\` | ${b.deployment === 'microservices' ? `${FRAMEWORK_LABELS[b.framework]} microservices behind an API gateway (${db}, Redis) – see [backend/README.md](backend/README.md)` : `${FRAMEWORK_LABELS[b.framework]} API (${db}) – see [backend/README.md](backend/README.md) and the API contract [backend/docs/API.md](backend/docs/API.md)`} |

The app already points at the backend (\`mobile/.env\` → \`API_BASE_URL=${DEV_API_URL}\`)${b.apiEncryption ? ' and both use the same API encryption key' : ''}.

## Run it

${b.deployment === 'microservices' ? microRun(b) : monolithRun}
From the root: \`npm run backend\`, \`npm run mobile\`, \`npm run android\`, \`npm run ios\`.

- **Android emulator:** \`localhost\` is rewritten to \`10.0.2.2\` automatically.
- **Real device:** set \`API_BASE_URL\` in \`mobile/.env\` to your computer's LAN IP (e.g. \`http://192.168.1.20:3000/api/v1\`),
  restart Metro with \`npm start -- --reset-cache\`.
${b.modules.notifications ? '- **Push notifications:** add the Firebase config files to the app (mobile/firebase/README.md) and `FIREBASE_SERVICE_ACCOUNT` to backend/.env.\n' : ''}- In development, emails / SMS codes are written to the backend log (see backend/README.md → Providers).
`;
}

function dockerCompose(b: BackendOptions): string {
  const name = new URL(devDatabaseUrl(b)).pathname.slice(1) || 'app';
  switch (b.database) {
    case 'postgresql':
      return `# Development database – matches DATABASE_URL in backend/.env
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ${name}
    ports:
      - '5432:5432'
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
`;
    case 'mysql':
      return `# Development database – matches DATABASE_URL in backend/.env
services:
  db:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: ${name}
    ports:
      - '3306:3306'
    volumes:
      - db-data:/var/lib/mysql

volumes:
  db-data:
`;
    case 'mongodb':
      return `# Development database – matches DATABASE_URL in backend/.env
services:
  db:
    image: mongo:8
    ports:
      - '27017:27017'
    volumes:
      - db-data:/data/db

volumes:
  db-data:
`;
  }
}

/** Root files: README, run scripts, docker-compose for the database, .gitignore. */
export async function writeRootFiles(o: FullstackOptions): Promise<void> {
  await fs.ensureDir(o.rootDir);
  await fs.writeFile(path.join(o.rootDir, 'README.md'), rootReadme(o));
  // Microservices: backend/docker-compose.yml has the database server + Redis.
  if (o.backend.deployment !== 'microservices') await fs.writeFile(path.join(o.rootDir, 'docker-compose.yml'), dockerCompose(o.backend));
  await fs.writeFile(path.join(o.rootDir, '.gitignore'), 'node_modules/\n.DS_Store\n*.log\n');
  await fs.writeJson(
    path.join(o.rootDir, 'package.json'),
    {
      name: `${o.frontend.appName.toLowerCase()}-workspace`,
      private: true,
      scripts: {
        backend: 'npm --prefix backend run dev',
        mobile: 'npm --prefix mobile start',
        android: 'npm --prefix mobile run android',
        ios: 'npm --prefix mobile run ios',
        ...(o.backend.deployment === 'microservices'
          ? { db: 'docker compose -f backend/docker-compose.yml up -d', test: 'npm --prefix backend test && npm --prefix mobile test' }
          : { db: 'docker compose up -d db', test: 'npm --prefix backend run test:all && npm --prefix mobile test' }),
      },
    },
    { spaces: 2 },
  );
}

export async function generateFullstack(o: FullstackOptions): Promise<{ warnings: string[] }> {
  const warnings: string[] = [];
  await writeRootFiles(o);
  // The backend first – it needs no network, and the app's .env already points at it.
  if (o.backend.deployment === 'microservices') warnings.push(...(await generateMicroservices(o.backend)).warnings);
  else warnings.push(...(await generateBackend(o.backend)).warnings);
  const app = await generateProject(o.frontend);
  warnings.push(...app.warnings);
  if (o.initGit) {
    const result = await initGit(o.rootDir).catch(() => 'unavailable' as const);
    if (result === 'unavailable') warnings.push('git was not found, the repository was not initialized.');
  }
  return { warnings };
}
