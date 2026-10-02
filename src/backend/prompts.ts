import fs from 'node:fs';
import path from 'node:path';
import { checkbox, confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import type { CliFlags } from '../cli/args.js';
import { log } from '../cli/logger.js';
import { askPayments } from '../cli/paymentPrompts.js';
import { GATEWAY_LABELS, IAP_LABELS } from '../config/payments.js';
import { GeneratorError } from '../utils/errors.js';
import { resolveUserPath } from '../utils/paths.js';
import { validateFacebookAppId, validateGoogleClientId, type SocialCredentials } from '../config/socialAuth.js';
import { BACKEND_ARCHITECTURES, getBackendArchitecture } from './architectures.js';
import { AUTH_LABELS, DATABASE_LABELS, FRAMEWORK_LABELS, HASHING_LABELS, ORM_LABELS } from './context.js';
import {
  DEFAULT_SECURITY,
  type BackendAuthMethods,
  type BackendModules,
  type BackendArchitectureId,
  type BackendAuth,
  type BackendDatabase,
  type BackendDeployment,
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

const AUTH_METHOD_ITEMS: Record<string, keyof BackendAuthMethods> = { email: 'email', mobile: 'mobileOtp', otp: 'mobileOtp', google: 'google', facebook: 'facebook', apple: 'apple' };
const MODULE_ITEMS: Record<string, keyof BackendModules> = { chat: 'chat', notifications: 'notifications', 'audio-call': 'audioCall', 'video-call': 'videoCall' };

/** `--flag a,b` → option keys (undefined when the flag isn't given). */
function parseList<K extends string>(value: string | undefined, items: Record<string, K>, flag: string): K[] | undefined {
  if (value === undefined) return undefined;
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const key = items[item];
      if (!key) throw new GeneratorError(`Invalid ${flag} item "${item}".`, { reason: `Allowed: ${Object.keys(items).join(', ')}` });
      return key;
    });
}

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

function describeMethods(m: BackendAuthMethods): string {
  const names = [m.email && 'email + password', m.mobileOtp && 'mobile OTP', m.google && 'Google', m.facebook && 'Facebook', m.apple && 'Apple'].filter(Boolean);
  return names.join(', ');
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
    ...(auth ? [`Sign-in:        ${describeMethods(o.authMethods)}`] : []),
    ...(auth && o.authMethods.email ? [`Hashing:        ${HASHING_LABELS[o.hashing]}`] : []),
    ...(auth ? [`Modules:        chat ${on(o.modules.chat)} · group chat ${on(o.modules.groupChat)} · audio call ${on(o.modules.audioCall)} · video call ${on(o.modules.videoCall)} · push notifications ${on(o.modules.notifications)} · delete account ${on(o.modules.deleteAccount)}`] : []),
    `Legal pages:    ${on(o.modules.legal)}`,
    ...(auth ? [`Payments:       in-app purchases ${chalk.cyan(IAP_LABELS[o.modules.inAppPurchase ?? 'none'])} · gateway ${chalk.cyan(GATEWAY_LABELS[o.modules.paymentGateway ?? 'none'])}`] : []),
    ...(auth ? [`Deployment:     ${o.deployment === 'microservices' ? 'microservices (gateway + services, Redis)' : 'monolith'}`] : []),
    `Redis:          ${on(o.redis)}${o.redis ? chalk.dim(' (rate limits, Socket.IO adapter, cache, OTP codes)') : ''}`,
    `Docker:         ${on(o.docker)}`,
    `Encryption:     ${on(o.apiEncryption)}`,
    `Swagger:        ${on(o.swagger)}`,
    `Rate limiting:  ${on(s.rateLimit)} global · ${on(auth && s.authRateLimit)} auth routes`,
    `Security:       helmet ${on(s.helmet)} · CORS ${on(s.cors)} · body limit ${on(s.bodyLimit)} · sanitize ${on(s.sanitize)}${auth ? ` · lockout ${on(s.accountLockout)}` : ''}`,
    ...(o.firebaseServiceAccountPath ? [`Firebase SA:    ${chalk.cyan(o.firebaseServiceAccountPath)} (copied to backend)`] : []),
    `Install deps:   ${on(o.installDependencies)}   Git: ${on(o.initGit)}`,
  ];
}

/** Full-stack: what the app decides for the backend (these questions are not asked). */
export type BackendPreset = Pick<
  BackendOptions,
  | 'appName'
  | 'displayName'
  | 'projectDir'
  | 'authMethods'
  | 'modules'
  | 'apiEncryption'
  | 'socialCredentials'
  | 'appPackage'
  | 'installDependencies'
  | 'initGit'
  | 'firebaseServiceAccountPath'
  | 'paymentCredentials'
  | 'agoraAppId'
  | 'agoraAppCertificate'
>;

/**
 * Backend wizard. Flags are used as-is; everything else is asked (or defaulted with --yes).
 * Ends with a summary: generate, go back and modify, or cancel – except with a `preset`
 * (full-stack), whose caller shows one summary for both projects.
 */
export async function collectBackendOptions(flags: CliFlags, previous?: BackendOptions, preset?: BackendPreset): Promise<BackendOptions> {
  const interactive = !flags.yes;
  const ask = <T>(flagValue: T | undefined, question: () => Promise<T>, fallback: T, label: string, format: (v: T) => string = String): Promise<T> => {
    if (flagValue !== undefined) {
      log.success(`${label}: ${chalk.cyan(format(flagValue))}`);
      return Promise.resolve(flagValue);
    }
    return interactive ? question() : Promise.resolve(fallback);
  };

  // Name + location
  let appName = preset?.appName ?? flags.name?.trim();
  if (preset) {
    // Given by the app.
  } else if (appName) {
    const valid = validateBackendName(appName);
    if (valid !== true) throw new GeneratorError(`Invalid --name: ${valid}`);
  } else if (interactive) {
    appName = (await input({ message: 'Backend project name:', default: previous?.appName ?? 'my-api', validate: validateBackendName })).trim();
  } else {
    throw new GeneratorError('--name is required with --yes.');
  }
  const parentDir = preset
    ? path.dirname(preset.projectDir)
    : resolveUserPath(flags.directory ?? (interactive && !previous ? await input({ message: 'Where should the project be created?', default: './' }) : previous ? path.dirname(previous.projectDir) : './'));
  if (!appName) throw new GeneratorError('--name is required with --yes.');

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
    // The app has sign-in screens, so a full-stack backend always has authentication.
    const wantsAuth = preset
      ? true
      : await select({
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

  // Sign-in methods
  let authMethods: BackendAuthMethods = { email: false, mobileOtp: false, google: false, facebook: false, apple: false };
  if (preset) {
    authMethods = { ...preset.authMethods };
  } else if (auth !== 'none') {
    const fromFlag = parseList(flags.authMethods, AUTH_METHOD_ITEMS, '--auth-methods');
    const picked =
      fromFlag ??
      (interactive
        ? await checkbox<keyof BackendAuthMethods>({
            message: 'How can users sign in? (space to toggle)',
            required: true,
            choices: [
              { name: 'Email + password', value: 'email', checked: previous?.authMethods.email ?? true, description: 'Register, login, forgot / reset password with emailed codes' },
              { name: 'Mobile number + OTP', value: 'mobileOtp', checked: previous?.authMethods.mobileOtp ?? false, description: 'SMS code (Twilio); the account is created on the first login' },
              { name: 'Google', value: 'google', checked: previous?.authMethods.google ?? false, description: 'ID token verified with Google' },
              { name: 'Facebook', value: 'facebook', checked: previous?.authMethods.facebook ?? false, description: 'Access token verified with the Graph API' },
              { name: 'Apple', value: 'apple', checked: previous?.authMethods.apple ?? false, description: 'Identity token verified with Apple' },
            ],
          })
        : (['email'] as const));
    for (const method of picked) authMethods[method] = true;
    if (fromFlag) log.success(`Sign-in methods: ${chalk.cyan(fromFlag.join(', '))}`);
  }

  // Social sign-in keys (optional – they can be set in .env later).
  const socialCredentials: SocialCredentials = preset?.socialCredentials ?? {
    googleWebClientId: flags.googleWebClientId?.trim() || undefined,
    googleIosClientId: flags.googleIosClientId?.trim() || undefined,
    facebookAppId: flags.facebookAppId?.trim() || undefined,
    facebookAppSecret: flags.facebookAppSecret?.trim() || undefined,
    appleServiceId: flags.appleServiceId?.trim() || undefined,
  };
  if (!preset && interactive) {
    if (authMethods.google && !socialCredentials.googleWebClientId) {
      socialCredentials.googleWebClientId =
        (await input({ message: 'Google login – the app\'s Web client ID (leave empty to set GOOGLE_CLIENT_IDS later):', validate: value => validateGoogleClientId(value, true) })).trim() || undefined;
    }
    if (authMethods.facebook && !socialCredentials.facebookAppId) {
      socialCredentials.facebookAppId = (await input({ message: 'Facebook login – App ID (leave empty to set it later):', validate: value => (value.trim() ? validateFacebookAppId(value) : true) })).trim() || undefined;
      if (socialCredentials.facebookAppId) socialCredentials.facebookAppSecret = (await input({ message: 'Facebook App Secret (leave empty to set it later):' })).trim() || undefined;
    }
  }

  // Password hashing (email + password accounts only)
  let hashing: PasswordHashing = 'none';
  if (authMethods.email) {
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

  // Feature modules – one Yes / No question each (the same questions as the app wizard).
  let modules: BackendModules = { chat: false, groupChat: false, audioCall: false, videoCall: false, notifications: false, legal: flags.terms ?? true, deleteAccount: flags.deleteAccount ?? true };
  const yesNo = (flag: boolean | undefined, message: string, label: string, fallback: boolean, current?: boolean) =>
    ask(
      flag,
      () =>
        select({
          message,
          default: current ?? fallback,
          choices: [
            { name: '1. Yes', value: true },
            { name: '2. No', value: false },
          ],
        }),
      fallback,
      label,
      v => (v ? 'yes' : 'no'),
    );
  let paymentCredentials = preset?.paymentCredentials ?? previous?.paymentCredentials;
  if (preset) {
    modules = { ...preset.modules };
  } else if (auth !== 'none') {
    // `--modules chat,notifications,audio-call,video-call` still works.
    const fromFlag = flags.modules === 'none' ? [] : parseList(flags.modules, MODULE_ITEMS, '--modules');
    const chat = fromFlag ? fromFlag.includes('chat') : await yesNo(flags.chat, 'Do you want Chat functionality?', 'Chat', false, previous?.modules.chat);
    const groupChat = chat ? await yesNo(flags.groupChat, 'Do you want Group Chat?', 'Group chat', false, previous?.modules.groupChat) : false;
    const audioCall = fromFlag ? fromFlag.includes('audioCall') : await yesNo(undefined, 'Do you want Audio Calling (Agora, CallKeep/iOS, native Android)?', 'Audio calling', false, previous?.modules.audioCall);
    const videoCall = fromFlag ? fromFlag.includes('videoCall') : await yesNo(undefined, 'Do you want Video Calling (Agora, camera, CallKeep/iOS, native Android)?', 'Video calling', false, previous?.modules.videoCall);
    const notifications = fromFlag
      ? fromFlag.includes('notifications')
      : await yesNo(flags.notifications, 'Do you want FCM / Push Notification support (device registration, device APIs)?', 'Push notifications', false, previous?.modules.notifications);
    const legal = await yesNo(flags.terms, 'Do you want Terms & Conditions (GET /legal + editable pages)?', 'Terms & Conditions', true, previous?.modules.legal);
    const deleteAccount = await yesNo(flags.deleteAccount, 'Do you want Delete Account functionality (DELETE /users/me)?', 'Delete account', true, previous?.modules.deleteAccount);
    // Payments: the same questions (and key prompts) as the app wizard.
    const payments = await askPayments(flags, interactive);
    paymentCredentials = payments.paymentCredentials;
    modules = { chat, groupChat, audioCall, videoCall, notifications, legal, deleteAccount, inAppPurchase: payments.inAppPurchase, paymentGateway: payments.paymentGateway };
    if (fromFlag) log.success(`Modules: ${chalk.cyan(fromFlag.join(', ') || 'none')}`);
  } else {
    // No accounts: only the legal pages make sense.
    modules = { ...modules, deleteAccount: false, legal: await yesNo(flags.terms, 'Do you want Terms & Conditions (GET /legal + editable pages)?', 'Terms & Conditions', true, previous?.modules.legal) };
  }

  // Deployment (microservices need accounts: the identity service is the core)
  const deployment: BackendDeployment =
    auth === 'none'
      ? 'monolith'
      : await ask(
          oneOf(flags.deployment, ['monolith', 'microservices'] as const, '--deployment'),
          () =>
            select<BackendDeployment>({
              message: 'Deployment',
              default: previous?.deployment ?? 'monolith',
              choices: [
                { name: '1. Monolith', value: 'monolith', description: 'One API project (simplest to run and deploy – recommended to start)' },
                {
                  name: '2. Microservices',
                  value: 'microservices',
                  description: 'API gateway + identity / chat / notifications services, one database each, Redis events',
                },
              ],
            }),
          'monolith',
          'Deployment',
          v => (v === 'microservices' ? 'microservices (gateway + services)' : 'monolith'),
        );

  // Redis – microservices can't run without it (their events travel over Redis).
  let redis: boolean;
  if (deployment === 'microservices') {
    if (flags.redis === false) throw new GeneratorError('--no-redis can\'t be used with --deployment microservices (the services talk over Redis).');
    redis = true;
    log.success(`Redis: ${chalk.cyan('yes (required by microservices)')}`);
  } else {
    redis = await ask(
      flags.redis,
      () =>
        select({
          message: 'Do you want Redis?',
          default: previous?.redis ?? false,
          choices: [
            { name: '1. No', value: false, description: 'Nothing extra to install or run (recommended to start – you can add Redis later)' },
            {
              name: '2. Yes',
              value: true,
              description: 'Rate limits shared by every server instance, Socket.IO across instances, a cache helper, OTP / verification codes with expiry',
            },
          ],
        }),
      false,
      'Redis',
      v => (v ? 'yes' : 'no'),
    );
  }

  const docker = await ask(
    flags.docker,
    () =>
      select({
        message: 'Do you want Docker?',
        default: previous?.docker ?? false,
        choices: [
          { name: '1. No', value: false, description: `No Docker files – install ${DATABASE_LABELS[database]}${redis ? ' and Redis' : ''} yourself (or use a hosted one)` },
          {
            name: '2. Yes',
            value: true,
            description: `docker-compose.yml (${DATABASE_LABELS[database]}${redis ? ' + Redis' : ''}) for development + a Dockerfile to build the API image`,
          },
        ],
      }),
    false,
    'Docker',
    v => (v ? 'yes' : 'no'),
  );

  // Security & rate limiting
  let security = parseSecurityFlag(flags.security);
  if (security) {
    log.success(`Security: ${chalk.cyan(Object.entries(security).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none')}`);
  } else if (interactive) {
    const current = previous?.security ?? DEFAULT_SECURITY;
    const picked = await checkbox<keyof BackendSecurity>({
      message: 'Security & rate limiting (space to toggle, enter to confirm)',
      pageSize: SECURITY_CHOICES.length,
      choices: SECURITY_CHOICES.filter(c => (!c.authOnly || auth !== 'none') && (c.key !== 'accountLockout' || authMethods.email)).map(c => ({
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
  if (!authMethods.email) security = { ...security, accountLockout: false };

  const apiEncryption = await ask(
    preset ? preset.apiEncryption : flags.encryption,
    () =>
      select({
        message: 'Encrypt API request / response bodies (AES, same as the app\'s API encryption)?',
        default: previous?.apiEncryption ?? false,
        choices: [
          { name: '1. No', value: false, description: 'Plain JSON over HTTPS (recommended)' },
          { name: '2. Yes', value: true, description: 'Bodies become { data: "<AES-256-CBC base64>" }; HTTPS is still required' },
        ],
      }),
    false,
    'API encryption',
    v => (v ? 'yes' : 'no'),
  );

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

  const installDependencies = preset
    ? preset.installDependencies
    : flags.install && (interactive ? await confirm({ message: 'Install dependencies now (npm install)?', default: previous?.installDependencies ?? true }) : true);
  const initGit = preset ? preset.initGit : flags.git && (interactive ? await confirm({ message: 'Initialize a git repository?', default: previous?.initGit ?? true }) : true);

  // Firebase service account for push notifications / VoIP calling
  let firebaseServiceAccountPath =
    preset?.firebaseServiceAccountPath ?? (flags.firebaseServiceAccount ? resolveUserPath(flags.firebaseServiceAccount) : previous?.firebaseServiceAccountPath);
  if (!firebaseServiceAccountPath && interactive && (modules.notifications || modules.audioCall || modules.videoCall)) {
    const saInput = await input({
      message: 'Path to firebase-service-account.json (for push/VoIP call notifications, leave empty to skip):',
      validate: (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return true;
        const resolved = resolveUserPath(trimmed);
        if (!fs.existsSync(resolved)) return `File not found at ${resolved}`;
        try {
          JSON.parse(fs.readFileSync(resolved, 'utf8'));
          return true;
        } catch {
          return 'File is not valid JSON.';
        }
      },
    });
    if (saInput.trim()) {
      firebaseServiceAccountPath = resolveUserPath(saInput.trim());
      log.success(`Firebase service account: ${chalk.cyan(firebaseServiceAccountPath)} (will be copied to backend root)`);
    }
  }

  // Agora credentials for audio/video calling
  let agoraAppId = preset?.agoraAppId ?? flags.agoraAppId ?? previous?.agoraAppId;
  let agoraAppCertificate = preset?.agoraAppCertificate ?? flags.agoraAppCertificate ?? previous?.agoraAppCertificate;
  if (!agoraAppId && interactive && (modules.audioCall || modules.videoCall)) {
    const appIdInput = await input({
      message: 'Agora App ID (leave empty to configure in backend .env later):',
    });
    if (appIdInput.trim()) {
      agoraAppId = appIdInput.trim();
      const certInput = await input({
        message: 'Agora App Certificate (leave empty to configure in backend .env later):',
      });
      if (certInput.trim()) {
        agoraAppCertificate = certInput.trim();
      }
    }
  }

  const options: BackendOptions = {
    appName,
    displayName: preset?.displayName ?? appName.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    projectDir: preset?.projectDir ?? path.join(parentDir, appName),
    framework,
    architecture,
    database,
    orm,
    auth,
    authMethods,
    hashing,
    modules,
    apiEncryption,
    socialCredentials,
    paymentCredentials,
    firebaseServiceAccountPath,
    agoraAppId,
    agoraAppCertificate,
    deployment,
    appPackage: preset?.appPackage ?? (flags.package?.trim() || `com.example.${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}`),
    swagger,
    security,
    redis,
    docker,
    installDependencies,
    initGit,
  };

  if (!interactive || preset) return options;

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
