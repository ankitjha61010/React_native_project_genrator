import { Command, InvalidArgumentError, Option } from 'commander';
import { parseSocialAuth, type SocialProviders } from '../config/socialAuth.js';
import { ARCHITECTURE_IDS } from '../architectures/index.js';
import { STATE_MANAGEMENT_IDS, STORAGE_IDS } from '../config/constants.js';
import { REACT_NATIVE_PROFILES } from '../config/reactNativeVersions.js';

export interface CliFlags {
  name?: string;
  package?: string;
  directory?: string;
  architecture?: string;
  state?: string;
  firebaseAndroid?: string;
  firebaseIos?: string;
  /** undefined = ask (interactive) / off (--yes). */
  encryption?: boolean;
  rtl?: boolean;
  themeContext?: boolean;
  vectorIcons?: boolean;
  analytics?: boolean;
  notifications?: boolean;
  authEmail?: boolean;
  authMobile?: boolean;
  socialAuth?: SocialProviders;
  googleWebClientId?: string;
  googleIosClientId?: string;
  facebookAppId?: string;
  facebookClientToken?: string;
  facebookAppSecret?: string;
  appleServiceId?: string;
  groupChat?: boolean;
  terms?: boolean;
  deleteAccount?: boolean;
  socket?: boolean;
  chat?: boolean;
  drawer?: boolean;
  /** frontend | backend | fullstack */
  type?: string;
  backendFramework?: string;
  backendArchitecture?: string;
  backendDatabase?: string;
  backendOrm?: string;
  backendAuth?: string;
  passwordHashing?: string;
  swagger?: boolean;
  /** Comma separated, `all` or `none`. */
  security?: string;
  /** Backend sign-in methods: comma list of email,mobile,google,facebook,apple. */
  authMethods?: string;
  /** Backend modules: comma list of chat,notifications, or `none`. */
  modules?: string;
  /** Backend deployment: monolith | microservices. */
  deployment?: string;
  /** Backend Redis (rate limits, Socket.IO adapter, cache, OTP codes). undefined = ask / off. */
  redis?: boolean;
  /** Backend Dockerfile + docker-compose.yml. undefined = ask / off. */
  docker?: boolean;
  storage?: string;
  install: boolean;
  pods: boolean;
  git: boolean;
  rnVersion?: string;
  dryRun: boolean;
  yes: boolean;
  force: boolean;
}

export function parseArgs(argv: string[], version: string): CliFlags {
  const program = new Command()
    .name('rn-architecture-generator')
    .description('Generate a React Native (TypeScript) app with a selectable architecture.')
    .version(version, '-v, --version')
    .option('-n, --name <name>', 'app name, e.g. FastRoute')
    .option('-p, --package <id>', 'Android package / iOS bundle id, e.g. com.example.fastroute')
    .option('-d, --directory <path>', 'parent directory the project folder is created in')
    .addOption(new Option('-a, --architecture <id>', 'architecture').choices(ARCHITECTURE_IDS))
    .addOption(new Option('-s, --state <id>', 'state management').choices(STATE_MANAGEMENT_IDS))
    .option('--firebase-android <path>', 'google-services.json to install')
    .option('--firebase-ios <path>', 'GoogleService-Info.plist to install')
    .option('--encryption', 'encrypt API requests/responses with AES (crypto-js)')
    .option('--no-encryption', 'send API requests as plain JSON')
    .option('--rtl', 'add right-to-left (RTL) layout support + Arabic')
    .option('--no-rtl', 'no RTL support')
    .option('--theme-context', 'add a light/dark ThemeProvider (useTheme)')
    .option('--no-theme-context', 'static light theme only')
    .option('--vector-icons', 'add @react-native-vector-icons/material-design-icons (iOS/Android configured)')
    .option('--no-vector-icons', 'no icon library')
    .option('--notifications', 'add push notification support (FCM + Notifee)')
    .option('--no-notifications', 'no push notifications')
    .option('--auth-email', 'enable email authentication (Sign In, Sign Up, Forgot/Reset Password)')
    .option('--no-auth-email', 'disable email authentication')
    .option('--auth-mobile', 'enable mobile OTP authentication (Phone Login, OTP Verification)')
    .option('--no-auth-mobile', 'disable mobile OTP authentication')
    .addOption(
      new Option('--social-auth <providers>', 'social login: none | all | a comma list of google,facebook,apple').argParser(value => {
        const providers = parseSocialAuth(value);
        if (!providers) throw new InvalidArgumentError('Use none, all or a comma list of google, facebook, apple.');
        return providers;
      }),
    )
    .option('--google-web-client-id <id>', 'configure Google login: web client id (…apps.googleusercontent.com)')
    .option('--google-ios-client-id <id>', 'configure Google login: iOS client id')
    .option('--facebook-app-id <id>', 'configure Facebook login: app id')
    .option('--facebook-client-token <token>', 'configure Facebook login: client token')
    .option('--facebook-app-secret <secret>', 'configure Facebook login: app secret (backend only)')
    .option('--apple-service-id <id>', 'Sign in with Apple: Services ID (optional, backend)')
    .option('--group-chat', 'chat: add group chats (admins, members, group name & image)')
    .option('--no-group-chat', 'chat: direct chats only')
    .option('--terms', 'Terms & Conditions / Privacy Policy links from the backend (GET /legal)')
    .option('--no-terms', 'no Terms & Conditions links')
    .option('--delete-account', 'Profile → Delete account (DELETE /users/me)')
    .option('--no-delete-account', 'no delete account')
    .option('--socket', 'implement Socket.io client for real-time events')
    .option('--no-socket', 'no socket client')
    .option('--chat', 'implement real-time chat with media/audio/video/documents')
    .option('--no-chat', 'no chat module')
    .option('--drawer', 'add a side drawer menu around the bottom tabs')
    .option('--no-drawer', 'bottom tabs only, no drawer')
    .option('--analytics', 'add Firebase Analytics (screen tracking + analyticsService)')
    .option('--no-analytics', 'no Firebase Analytics')
    .addOption(new Option('--storage <engine>', 'key-value storage').choices(STORAGE_IDS))
    .option('--no-install', 'skip npm install')
    .option('--no-pods', 'skip CocoaPods installation (macOS)')
    .option('--no-git', 'skip git initialisation')
    .addOption(
      new Option('--rn-version <version>', 'React Native version').choices(
        REACT_NATIVE_PROFILES.flatMap(p => [p.reactNative, p.reactNative.split('.').slice(0, 2).join('.')]),
      ),
    )
    .addOption(new Option('--type <type>', 'what to generate').choices(['frontend', 'backend', 'fullstack']))
    .addOption(new Option('--backend-framework <id>', 'backend framework').choices(['nestjs', 'express']))
    .addOption(
      new Option('--backend-architecture <id>', 'backend architecture').choices(['feature-based', 'layered', 'clean', 'mvc', 'modular', 'enterprise']),
    )
    .addOption(new Option('--backend-database <id>', 'backend database').choices(['postgresql', 'mysql', 'mongodb']))
    .addOption(new Option('--backend-orm <id>', 'ORM / ODM').choices(['prisma', 'typeorm', 'mongoose']))
    .addOption(new Option('--backend-auth <id>', 'backend authentication').choices(['none', 'jwt', 'access-refresh', 'refresh-rotation']))
    .addOption(new Option('--password-hashing <id>', 'password hashing').choices(['bcrypt', 'argon2', 'configurable']))
    .option('--swagger', 'generate Swagger / OpenAPI docs (backend)')
    .option('--no-swagger', 'no API docs (backend)')
    .option(
      '--security <items>',
      'backend security: all | none | comma list of helmet,cors,rate-limit,auth-rate-limit,body-limit,sanitize,account-lockout',
    )
    .option('--auth-methods <items>', 'backend sign-in methods: comma list of email,mobile,google,facebook,apple')
    .option('--modules <items>', 'backend modules: comma list of chat,notifications, or none')
    .addOption(new Option('--deployment <id>', 'backend deployment').choices(['monolith', 'microservices']))
    .option('--redis', 'backend: use Redis (shared rate limits, Socket.IO adapter, cache, OTP codes)')
    .option('--no-redis', 'backend: no Redis (microservices always use it)')
    .option('--docker', 'backend: add a Dockerfile + docker-compose.yml (database, Redis)')
    .option('--no-docker', 'backend: no Docker files')
    .option('--dry-run', 'show what would be generated without writing anything', false)
    .option('-y, --yes', 'use defaults for everything not passed as a flag (non-interactive)', false)
    .option('-f, --force', 'overwrite the target directory if it exists', false)
    .addHelpText(
      'after',
      `
Examples:
  $ npx rn-architecture-generator
  $ npx rn-architecture-generator --dry-run
  $ npx rn-architecture-generator --name FastRoute --package com.example.fastroute --architecture feature-based -y
  $ npx rn-architecture-generator --type backend --name my-api --backend-framework nestjs --backend-architecture clean -y
`,
    );

  program.parse(argv);
  return program.opts<CliFlags>();
}
