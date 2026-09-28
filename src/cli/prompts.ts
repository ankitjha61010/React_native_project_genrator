import fs from 'node:fs';
import path from 'node:path';
import { confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { getArchitecture, isArchitectureId } from '../architectures/index.js';
import { isStateManagement, isStorageEngine, STATE_MANAGEMENT_LABELS, STORAGE_LABELS } from '../config/constants.js';
import { DEFAULT_REACT_NATIVE_VERSION } from '../config/reactNativeVersions.js';
import { SOCIAL_LOGIN_CHOICES } from '../config/socialAuth.js';
import type { ArchitectureId, ProjectOptions, SocialLoginOption, StateManagement, StorageEngine } from '../core/types.js';
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
    socialAuth: 'none',
    socket: false,
    chat: false,
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

  // Push Notifications (FCM + Notifee)
  const notifications = await askYesNo(
    flags.notifications,
    interactive,
    'Do you want to implement push notifications (Firebase Messaging + Notifee background handlers)?',
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

  // Social Logins (Google / Facebook / Apple)
  let socialAuth: SocialLoginOption;
  if (flags.socialAuth !== undefined) {
    socialAuth = flags.socialAuth;
    log.success(`Social login: ${chalk.cyan(socialAuth)}`);
  } else if (interactive) {
    socialAuth = await select({
      message: 'Do you want to add Social Login (Google / Facebook / Apple)?',
      choices: SOCIAL_LOGIN_CHOICES.map(c => ({ name: c.label, value: c.value, description: c.description })),
      default: 'none',
    });
  } else {
    socialAuth = 'none';
  }

  // Socket.io Real-time Client
  const socket = await askYesNo(
    flags.socket,
    interactive,
    'Do you want to implement Socket.io client for real-time events & listeners?',
    'Socket.io client',
    false,
  );

  // Real-Time Chat (WhatsApp style with Media, Audio, Video, Docs)
  const chat = await askYesNo(
    flags.chat,
    interactive,
    'Do you want to implement a WhatsApp-style Real-Time Chat module (Chat list, Chat room, Audio/Video/Image/Doc messages)?',
    'Real-time Chat module',
    false,
  );

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
    socket: socket || chat, // chat automatically enables socket client
    chat,
    drawer,
    firebase,
    analytics,
    installDependencies,
    installPods,
    initGit,
    overwrite,
  };
}
