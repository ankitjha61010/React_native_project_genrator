import fs from 'node:fs';
import path from 'node:path';
import { confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { getArchitecture, isArchitectureId } from '../architectures/index.js';
import { isStateManagement, isStorageEngine, STATE_MANAGEMENT_LABELS, STORAGE_LABELS } from '../config/constants.js';
import { DEFAULT_REACT_NATIVE_VERSION } from '../config/reactNativeVersions.js';
import { NO_SOCIAL, validateFacebookAppId, validateGoogleClientId, type SocialCredentials, type SocialProviders } from '../config/socialAuth.js';
import type { ArchitectureId, ProjectOptions, StateManagement, StorageEngine } from '../core/types.js';
import { GeneratorError } from '../utils/errors.js';
import { validateGoogleServiceInfoPlist, validateGoogleServicesJson } from '../utils/firebaseFiles.js';
import { resolveUserPath } from '../utils/paths.js';
import { defaultPackageName, toDisplayName, validateAppName, validatePackageName } from '../utils/validation.js';
import type { CliFlags } from './args.js';
import { log } from './logger.js';
import { chooseArchitecture } from './menu.js';

function assertValid(result: true | string, flag: string): void {
  if (result !== true) {
    throw new GeneratorError(`Invalid ${flag}: ${result}`);
  }
}

function isNonEmptyDirectory(dir: string): boolean {
  try {
    return fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

async function validateFirebaseAndroid(file: string, packageName: string): Promise<true | string> {
  try {
    await validateGoogleServicesJson(resolveUserPath(file), packageName);
    return true;
  } catch (error) {
    return (error as Error).message;
  }
}

async function validateFirebaseIos(file: string, bundleId: string): Promise<true | string> {
  try {
    const warnings = await validateGoogleServiceInfoPlist(resolveUserPath(file), bundleId);
    warnings.forEach(w => log.warn(w));
    return true;
  } catch (error) {
    return (error as Error).message;
  }
}

/** Flag value if passed, otherwise a Yes/No prompt (or the default with --yes). */
async function askYesNo(
  flag: boolean | undefined,
  interactive: boolean,
  message: string,
  label: string,
  defaultValue: boolean,
): Promise<boolean> {
  if (flag !== undefined) {
    log.success(`${label}: ${chalk.cyan(flag ? 'yes' : 'no')}`);
    return flag;
  }
  if (!interactive) {
    return defaultValue;
  }
  return select({
    message,
    choices: [
      { name: 'Yes', value: true },
      { name: 'No', value: false },
    ],
    default: defaultValue,
  });
}

type ProviderChoice = 'configure' | 'skip' | 'none';

/**
 * Google / Facebook / Apple, one question each:
 *   1. Configure – enter the keys now (they are written into .env, Info.plist, strings.xml and the backend),
 *   2. Skip – add the provider with YOUR_… placeholders (listed in docs/SOCIAL_LOGIN.md),
 *   3. Don't include.
 * Flags: --social-auth picks the providers, credential flags configure them.
 */
async function askSocialLogin(flags: CliFlags, interactive: boolean): Promise<{ providers: SocialProviders; credentials: SocialCredentials }> {
  const credentials: SocialCredentials = {
    googleWebClientId: flags.googleWebClientId?.trim() || undefined,
    googleIosClientId: flags.googleIosClientId?.trim() || undefined,
    facebookAppId: flags.facebookAppId?.trim() || undefined,
    facebookClientToken: flags.facebookClientToken?.trim() || undefined,
    facebookAppSecret: flags.facebookAppSecret?.trim() || undefined,
    appleServiceId: flags.appleServiceId?.trim() || undefined,
  };
  if (flags.socialAuth || !interactive) {
    const providers = flags.socialAuth ?? { google: Boolean(credentials.googleWebClientId), facebook: Boolean(credentials.facebookAppId), apple: false };
    for (const [id, valid] of [
      ['--google-web-client-id', credentials.googleWebClientId ? validateGoogleClientId(credentials.googleWebClientId) : true],
      ['--google-ios-client-id', credentials.googleIosClientId ? validateGoogleClientId(credentials.googleIosClientId) : true],
      ['--facebook-app-id', credentials.facebookAppId ? validateFacebookAppId(credentials.facebookAppId) : true],
    ] as const) {
      if (valid !== true) throw new GeneratorError(`Invalid ${id}: ${valid}`);
    }
    log.success(`Social login: ${chalk.cyan(Object.entries(providers).filter(([, on]) => on).map(([name]) => name).join(', ') || 'none')}`);
    return { providers, credentials };
  }

  const ask = (provider: string, configureHint: string) =>
    select<ProviderChoice>({
      message: `${provider} Login?`,
      choices: [
        { name: '1. Configure', value: 'configure', description: configureHint },
        { name: '2. Skip', value: 'skip', description: 'Add it with YOUR_… placeholder keys – fill them in later (docs/SOCIAL_LOGIN.md)' },
        { name: "3. Don't include", value: 'none', description: `No ${provider} button and no ${provider} SDK` },
      ],
      default: 'none',
    });

  const google = await ask('Google', 'Enter the OAuth client IDs now (Google Cloud Console → APIs & Services → Credentials)');
  if (google === 'configure') {
    credentials.googleWebClientId = (await input({ message: 'Google Web client ID:', validate: value => validateGoogleClientId(value) })).trim();
    credentials.googleIosClientId =
      (await input({ message: 'Google iOS client ID (leave empty to add it later):', validate: value => validateGoogleClientId(value, true) })).trim() || undefined;
  }
  const facebook = await ask('Facebook', 'Enter the App ID and Client Token now (Meta for Developers → App settings)');
  if (facebook === 'configure') {
    credentials.facebookAppId = (await input({ message: 'Facebook App ID:', validate: validateFacebookAppId })).trim();
    credentials.facebookClientToken = (await input({ message: 'Facebook Client Token (App settings → Advanced):', validate: v => (v.trim() ? true : 'Enter the client token (or choose Skip).') })).trim();
    credentials.facebookAppSecret = (await input({ message: 'Facebook App Secret – for the backend (leave empty to add it later):' })).trim() || undefined;
  }
  const apple = await ask('Apple', 'Sign in with Apple uses your bundle id – optionally enter a Services ID (web / Android)');
  if (apple === 'configure') {
    credentials.appleServiceId = (await input({ message: 'Apple Services ID (leave empty – the bundle id is enough for the iOS app):' })).trim() || undefined;
  }
  return { providers: { google: google !== 'none', facebook: facebook !== 'none', apple: apple !== 'none' }, credentials };
}

/**
 * Collects every option. Values passed as flags are used as-is (after validation);
 * missing ones are prompted for, or defaulted with --yes.
 */
export async function collectOptions(flags: CliFlags): Promise<ProjectOptions> {
  const interactive = !flags.yes;
  if (interactive && !process.stdin.isTTY) {
    throw new GeneratorError('No interactive terminal detected.', {
      tryHints: ['Pass --yes together with --name / --package / --architecture to run non-interactively.'],
    });
  }

  // App name
  let appName = flags.name?.trim();
  if (appName) {
    assertValid(validateAppName(appName), '--name');
    log.success(`Project name: ${chalk.cyan(appName)}`);
  } else if (interactive) {
    appName = (await input({ message: 'What is your app name?', default: 'MyApp', validate: validateAppName })).trim();
  } else {
    throw new GeneratorError('--name is required with --yes.');
  }

  // Package name
  let packageName = flags.package?.trim();
  if (packageName) {
    assertValid(validatePackageName(packageName), '--package');
    log.success(`Package name: ${chalk.cyan(packageName)}`);
  } else if (interactive) {
    packageName = (
      await input({
        message: 'What is your Android package name? (also used as iOS bundle id)',
        default: defaultPackageName(appName),
        validate: validatePackageName,
      })
    ).trim();
  } else {
    packageName = defaultPackageName(appName);
  }

  // Location
  const location =
    flags.directory ??
    (interactive ? await input({ message: 'Where should the project be created?', default: './' }) : './');
  const parentDir = resolveUserPath(location);
  const projectDir = path.join(parentDir, appName);

  const base: ProjectOptions = {
    appName,
    displayName: toDisplayName(appName),
    packageName,
    parentDir,
    architecture: 'feature-based',
    stateManagement: 'redux',
    firebase: {},
    analytics: false,
    storage: 'mmkv',
    apiEncryption: false,
    rtl: false,
    themeContext: false,
    vectorIcons: true,
    notifications: true,
    authEmail: true,
    authMobile: false,
    socialAuth: { ...NO_SOCIAL },
    socialCredentials: {},
    socket: false,
    chat: false,
    groupChat: false,
    termsAndConditions: true,
    deleteAccount: true,
    drawer: false,
    initGit: flags.git,
    installDependencies: flags.install,
    installPods: flags.pods && process.platform === 'darwin',
    overwrite: flags.force,
    reactNativeVersion: flags.rnVersion ?? DEFAULT_REACT_NATIVE_VERSION,
  };

  // Architecture
  let architecture: ArchitectureId;
  if (flags.architecture && isArchitectureId(flags.architecture)) {
    architecture = flags.architecture;
    log.success(`Architecture: ${chalk.cyan(getArchitecture(architecture).name)}`);
  } else if (interactive) {
    architecture = await chooseArchitecture(base);
  } else {
    architecture = 'feature-based';
  }
  const arch = getArchitecture(architecture);

  // State management
  let stateManagement: StateManagement;
  if (arch.forcedStateManagement) {
    stateManagement = arch.forcedStateManagement;
    if (flags.state && flags.state !== stateManagement) {
      log.warn(`${arch.name} always uses ${STATE_MANAGEMENT_LABELS[stateManagement]} – ignoring --state ${flags.state}.`);
    }
    log.success(`State management: ${chalk.cyan(STATE_MANAGEMENT_LABELS[stateManagement])} (required by ${arch.name})`);
  } else if (flags.state && isStateManagement(flags.state)) {
    stateManagement = flags.state;
    log.success(`State management: ${chalk.cyan(STATE_MANAGEMENT_LABELS[stateManagement])}`);
  } else if (interactive) {
    stateManagement = await select<StateManagement>({
      message: 'Select state management:',
      default: 'redux',
      choices: (['zustand', 'redux', 'context', 'none'] as const).map(id => ({ name: STATE_MANAGEMENT_LABELS[id], value: id })),
    });
  } else {
    stateManagement = 'redux';
  }

  // Key-value storage
  let storage: StorageEngine;
  if (flags.storage && isStorageEngine(flags.storage)) {
    storage = flags.storage;
    log.success(`Storage: ${chalk.cyan(STORAGE_LABELS[storage])}`);
  } else if (interactive) {
    storage = await select<StorageEngine>({
      message: 'Which local storage do you want to use?',
      default: 'mmkv',
      choices: (['mmkv', 'async-storage'] as const).map(id => ({ name: STORAGE_LABELS[id], value: id })),
    });
  } else {
    storage = 'mmkv';
  }

  // API payload encryption
  let apiEncryption: boolean;
  if (flags.encryption !== undefined) {
    apiEncryption = flags.encryption;
    log.success(`API requests: ${chalk.cyan(apiEncryption ? 'encrypted (AES, crypto-js)' : 'plain JSON')}`);
  } else if (interactive) {
    apiEncryption = await select({
      message: 'How should API requests and responses be sent?',
      choices: [
        { name: 'Plain JSON', value: false },
        {
          name: 'Encrypted (AES-256 with crypto-js)',
          value: true,
          description: chalk.dim('Request bodies are encrypted and responses decrypted in the Axios interceptors.'),
        },
      ],
      default: false,
    });
  } else {
    apiEncryption = false;
  }

  // RTL
  let rtl: boolean;
  if (flags.rtl !== undefined) {
    rtl = flags.rtl;
    log.success(`RTL support: ${chalk.cyan(rtl ? 'yes' : 'no')}`);
  } else if (interactive) {
    rtl = await select({
      message: 'Do you need RTL (right-to-left) layout support?',
      choices: [
        { name: 'No', value: false },
        { name: 'Yes, add RTL support (with Arabic as sample language)', value: true },
      ],
      default: false,
    });
  } else {
    rtl = false;
  }

  // Color theme context
  const themeContext = await askYesNo(
    flags.themeContext,
    interactive,
    'Do you want a color theme context (light / dark / system via useTheme)?',
    'Theme context',
    false,
  );

  // Vector icons
  const vectorIcons = await askYesNo(
    flags.vectorIcons,
    interactive,
    'Do you want vector icons (@react-native-vector-icons/material-design-icons, iOS Info.plist + Android configured)?',
    'Vector icons',
    true,
  );

  // Authentication: Email Authentication (Sign In, Sign Up, Forgot Password, Reset Password)
  const authEmail = await askYesNo(
    flags.authEmail,
    interactive,
    'Do you want to enable Email Authentication (Sign In, Sign Up, Forgot & Reset Password)?',
    'Email authentication',
    true,
  );

  // Authentication: Mobile OTP Authentication (Phone Login, OTP Verification, Forgot PIN)
  const authMobile = await askYesNo(
    flags.authMobile,
    interactive,
    'Do you want to enable Mobile OTP Authentication (Sign In with Phone, OTP verification)?',
    'Mobile OTP authentication',
    false,
  );

  // Social logins – each provider on its own: configure now, add with placeholders, or leave out.
  const { providers: socialAuth, credentials: socialCredentials } = await askSocialLogin(flags, interactive);

  // Real-Time Chat (WhatsApp style with Media, Audio, Video, Docs)
  const chat = await askYesNo(
    flags.chat,
    interactive,
    'Do you want Chat functionality (chat list, chat room, photos / videos / files / voice messages)?',
    'Chat',
    false,
  );

  // Group chats (admins, members, name & image) – only with chat.
  const groupChat = chat
    ? await askYesNo(flags.groupChat, interactive, 'Do you want Group Chat (create groups, admins / members, add / remove members, leave)?', 'Group chat', false)
    : false;

  // Socket.io Real-time Client (chat always has it)
  const socket = chat
    ? true
    : await askYesNo(flags.socket, interactive, 'Do you want to implement Socket.io client for real-time events & listeners?', 'Socket.io client', false);

  // Push Notifications (FCM + Notifee)
  const notifications = await askYesNo(
    flags.notifications,
    interactive,
    'Do you want FCM / Push Notification support (device registration, FCM token, Notifee)?',
    'Push notifications',
    true,
  );

  // Firebase
  const firebase: ProjectOptions['firebase'] = {};
  if (flags.firebaseAndroid) {
    assertValid(await validateFirebaseAndroid(flags.firebaseAndroid, packageName), '--firebase-android');
    firebase.androidConfigPath = resolveUserPath(flags.firebaseAndroid);
  }
  if (flags.firebaseIos) {
    assertValid(await validateFirebaseIos(flags.firebaseIos, packageName), '--firebase-ios');
    firebase.iosConfigPath = resolveUserPath(flags.firebaseIos);
  }
  if (interactive && !flags.firebaseAndroid && !flags.firebaseIos) {
    const configureNow = await select({
      message: 'Do you want to configure Firebase now?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No, configure later', value: false },
      ],
      default: false,
    });
    if (configureNow) {
      const androidFile = await input({
        message: 'Path to google-services.json (leave empty to skip):',
        validate: value => (value.trim() ? validateFirebaseAndroid(value, packageName) : true),
      });
      if (androidFile.trim()) firebase.androidConfigPath = resolveUserPath(androidFile);
      const iosFile = await input({
        message: 'Path to GoogleService-Info.plist (leave empty to skip):',
        validate: value => (value.trim() ? validateFirebaseIos(value, packageName) : true),
      });
      if (iosFile.trim()) firebase.iosConfigPath = resolveUserPath(iosFile);
    }
  }

  // Firebase Analytics – asked together with the Firebase setup, only added when wanted.
  const analytics = await askYesNo(
    flags.analytics,
    interactive,
    'Do you want to set up Firebase Analytics (analyticsService + automatic screen tracking)?',
    'Firebase Analytics',
    false,
  );

  // Terms & Conditions / Privacy Policy – the links come from the backend (GET /legal).
  const termsAndConditions = await askYesNo(
    flags.terms,
    interactive,
    'Do you want Terms & Conditions (links read from the backend, opened in the app)?',
    'Terms & Conditions',
    true,
  );

  // Profile → Delete account (required by the App Store / Play Store for apps with sign-up).
  const deleteAccount = await askYesNo(flags.deleteAccount, interactive, 'Do you want Delete Account functionality (Profile → Delete account)?', 'Delete account', true);

  // Navigation: side drawer around the bottom tabs
  const drawer = await askYesNo(
    flags.drawer,
    interactive,
    'Do you want to display a side Drawer menu (drawer + bottom tabs)?',
    'Drawer navigation',
    false,
  );

  // Install / pods / git
  let { installDependencies, installPods, initGit } = base;
  if (interactive) {
    if (flags.install) {
      installDependencies = await confirm({ message: 'Install dependencies now (npm install)?', default: true });
    }
    if (installDependencies && installPods) {
      installPods = await confirm({ message: 'Install CocoaPods now (can take a few minutes)?', default: true });
    }
    if (flags.git) {
      initGit = await select({
        message: 'Initialize git repository?',
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
      });
    }
  }
  if (!installDependencies) installPods = false;

  // Existing directory
  let overwrite = flags.force;
  if (!flags.dryRun && isNonEmptyDirectory(projectDir) && !overwrite) {
    if (!interactive) {
      throw new GeneratorError(`The directory ${projectDir} already exists and is not empty.`, {
        tryHints: ['Choose another --name / --directory, or pass --force to replace it.'],
      });
    }
    overwrite = await confirm({
      message: `${projectDir} already exists and is not empty. Delete it and create the project there?`,
      default: false,
    });
    if (!overwrite) {
      throw new GeneratorError('Cancelled – the existing directory was left untouched.');
    }
  }

  return {
    ...base,
    architecture,
    stateManagement,
    storage,
    apiEncryption,
    rtl,
    themeContext,
    vectorIcons,
    notifications,
    authEmail,
    authMobile,
    socialAuth,
    socialCredentials,
    socket,
    chat,
    groupChat,
    termsAndConditions,
    deleteAccount,
    drawer,
    firebase,
    analytics,
    installDependencies,
    installPods,
    initGit,
    overwrite,
  };
}
