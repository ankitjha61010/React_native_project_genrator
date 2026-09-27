import { Command, Option } from 'commander';
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
  socialAuth?: 'google' | 'facebook' | 'both' | 'none';
  socket?: boolean;
  chat?: boolean;
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
    .addOption(new Option('--social-auth <type>', 'social login provider').choices(['google', 'facebook', 'both', 'none']))
    .option('--socket', 'implement Socket.io client for real-time events')
    .option('--no-socket', 'no socket client')
    .option('--chat', 'implement real-time chat with media/audio/video/documents')
    .option('--no-chat', 'no chat module')
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
`,
    );

  program.parse(argv);
  return program.opts<CliFlags>();
}
