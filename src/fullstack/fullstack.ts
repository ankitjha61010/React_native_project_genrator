import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs-extra';
import { generateBackend } from '../backend/generator.js';
import { generateMicroservices } from '../backend/microservices.js';
import { collectBackendOptions, describeBackend, type BackendPreset } from '../backend/prompts.js';
import type { BackendOptions } from '../backend/types.js';
import { DATABASE_LABELS, FRAMEWORK_LABELS } from '../backend/context.js';
import type { CliFlags } from '../cli/args.js';
import { log } from '../cli/logger.js';
import { collectOptions } from '../cli/prompts.js';
import type { ProjectOptions } from '../core/types.js';
import { generateAdminPanel } from '../generators/adminGenerator.js';
import { GATEWAY_LABELS, IAP_LABELS } from '../config/payments.js';
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
  const social = frontend.socialAuth;
  const slug = frontend.appName.toLowerCase();
  return {
    appName: `${slug}-api`,
    displayName: frontend.displayName,
    projectDir: path.join(rootDir, 'backend'),
    // The app's login screen always has email + password.
    authMethods: { email: true, mobileOtp: frontend.authMobile, google: social.google, facebook: social.facebook, apple: social.apple },
    modules: { chat: frontend.chat, groupChat: frontend.chat && frontend.groupChat, audioCall: frontend.audioCall, videoCall: frontend.videoCall, notifications: frontend.notifications, legal: frontend.termsAndConditions, deleteAccount: frontend.deleteAccount, ota: frontend.ota, inAppPurchase: frontend.inAppPurchase, paymentGateway: frontend.paymentGateway },
    apiEncryption: frontend.apiEncryption,
    // The keys entered for the app – the backend verifies the same client ids.
    socialCredentials: frontend.socialCredentials,
    // The payment keys entered for the app – the secret ones only go to the backend's .env.
    paymentCredentials: frontend.paymentCredentials,
    appPackage: frontend.packageName,
    installDependencies: frontend.installDependencies,
    // One repository for both projects (created at the root).
    initGit: false,
  };
}

/** README line about payments: what was chosen and where the keys go. */
function paymentsLine(o: FullstackOptions): string {
  const iap = o.frontend.inAppPurchase ?? 'none';
  const gateway = o.frontend.paymentGateway ?? 'none';
  if (iap === 'none' && gateway === 'none') return '';
  const what = [iap !== 'none' && `in-app purchases (${IAP_LABELS[iap]})`, gateway !== 'none' && `${GATEWAY_LABELS[gateway]} checkout`].filter(Boolean).join(' + ');
  return `\n**Payments:** ${what}. Keys go in \`backend/.env\`${iap === 'adapty' ? ' (and the Adapty public SDK key in `mobile/.env`)' : ''} – dummy \`REPLACE_ME\` values answer "not configured" until then. Products are managed in the admin panel → Payments. Details: [backend/docs/PAYMENTS.md](backend/docs/PAYMENTS.md), [mobile/docs/PAYMENTS.md](mobile/docs/PAYMENTS.md).\n`;
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
${b.docker ? 'docker compose -f backend/docker-compose.yml up -d db redis' : `#    install / start ${DATABASE_LABELS[b.database]} and Redis yourself – see backend/README.md`}

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
  const infra = b.redis ? `${db} + Redis` : db;
  const monolithRun = `\`\`\`sh
# 1. Database (${infra})${b.docker ? ' – or point DATABASE_URL in backend/.env at your own' : ''}
${b.docker ? `docker compose -f backend/docker-compose.yml up -d db${b.redis ? ' redis' : ''}` : `#    install / start ${infra} yourself, then set DATABASE_URL${b.redis ? ' / REDIS_URL' : ''} in backend/.env`}

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
${o.frontend.adminPanel ? `| \`admin/\` | ${o.frontend.adminTechStack === 'next' ? 'Next.js' : 'React + Vite'} Admin Console – see [admin/README.md](admin/README.md) |\n` : ''}
The app already points at the backend (\`mobile/.env\` → \`API_BASE_URL=${DEV_API_URL}\`)${b.apiEncryption ? ' and both use the same API encryption key' : ''}.
${paymentsLine(o)}
## Run it

${b.deployment === 'microservices' ? microRun(b) : monolithRun}
From the root: \`npm run backend\`, \`npm run mobile\`, \`npm run android\`, \`npm run ios\`${o.frontend.adminPanel ? ', `npm run admin`' : ''}.

- **Android emulator:** \`localhost\` is rewritten to \`10.0.2.2\` automatically.
- **Real device:** set \`API_BASE_URL\` in \`mobile/.env\` to your computer's LAN IP (e.g. \`http://192.168.1.20:3000/api/v1\`),
  restart Metro with \`npm start -- --reset-cache\`.
${b.modules.notifications ? '- **Push notifications:** add the Firebase config files to the app (mobile/firebase/README.md) and `FIREBASE_SERVICE_ACCOUNT` to backend/.env.\n' : ''}- In development, emails / SMS codes are written to the backend log (see backend/README.md → Providers).
`;
}

/** Root files: README, run scripts, .gitignore (Docker files, when chosen, are in backend/). */
export async function writeRootFiles(o: FullstackOptions): Promise<void> {
  await fs.ensureDir(o.rootDir);
  await fs.writeFile(path.join(o.rootDir, 'README.md'), rootReadme(o));
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
        ...(o.frontend.adminPanel ? { admin: 'npm --prefix admin run dev' } : {}),
        ...(o.backend.docker ? { db: `docker compose -f backend/docker-compose.yml up -d db${o.backend.redis ? ' redis' : ''}` } : {}),
        test: o.backend.deployment === 'microservices' ? 'npm --prefix backend test && npm --prefix mobile test' : 'npm --prefix backend run test:all && npm --prefix mobile test',
      },
    },
    { spaces: 2 },
  );
}

export async function generateFullstack(o: FullstackOptions): Promise<{ warnings: string[] }> {
  const warnings: string[] = [];
  // The admin console must use the backend's exact key / IV, so pin them before the backend writes its .env.
  if (o.backend.apiEncryption) o.backend.encryptionSecrets ??= { key: randomBytes(24).toString('base64url'), iv: randomBytes(12).toString('base64url') };
  await writeRootFiles(o);
  // The backend first – it needs no network, and the app's .env already points at it.
  if (o.backend.deployment === 'microservices') warnings.push(...(await generateMicroservices(o.backend)).warnings);
  else warnings.push(...(await generateBackend(o.backend)).warnings);
  const app = await generateProject(o.frontend);
  warnings.push(...app.warnings);

  if (o.frontend.adminPanel) {
    const admin = await generateAdminPanel({
      adminDir: path.join(o.rootDir, 'admin'),
      techStack: o.frontend.adminTechStack ?? 'react',
      appName: o.frontend.appName,
      displayName: o.frontend.displayName,
      apiBaseUrl: DEV_API_URL,
      ota: o.frontend.ota,
      encryption: o.backend.apiEncryption ? o.backend.encryptionSecrets : undefined,
      inAppPurchase: o.frontend.inAppPurchase,
      paymentGateway: o.frontend.paymentGateway,
      installDependencies: o.frontend.installDependencies,
    });
    warnings.push(...admin.warnings);
  }

  if (o.initGit) {
    const result = await initGit(o.rootDir).catch(() => 'unavailable' as const);
    if (result === 'unavailable') warnings.push('git was not found, the repository was not initialized.');
  }
  return { warnings };
}
