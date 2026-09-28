import chalk from 'chalk';
import { resolveDependencies, getProfile } from '../config/compatibility.js';
import { STATE_MANAGEMENT_LABELS, STORAGE_LABELS } from '../config/constants.js';
import { SOCIAL_LOGIN_CHOICES, socialProviders } from '../config/socialAuth.js';
import { architectureTree, prepareGeneration } from '../core/context.js';
import { allPlannedPaths } from '../core/plan.js';
import type { ProjectOptions } from '../core/types.js';
import { renderPlan } from './fileGenerator.js';

export const NATIVE_CHANGES = [
  'android/build.gradle            Google Services Gradle plugin classpath',
  'android/app/build.gradle        apply Google Services when google-services.json exists',
  'android/app/src/main/AndroidManifest.xml   POST_NOTIFICATIONS + CAMERA permissions, supportsRtl only with RTL support',
  'android/app/src/main/res/values/strings.xml  app display name',
  'ios/Podfile                     react-native-permissions setup + static frameworks, Firebase via CocoaPods (SPM off)',
  'ios/.xcode.env                  resolves node via nvm/fnm/Volta/Homebrew/PATH (no hard-coded path)',
  'ios/<App>/AppDelegate.swift     FirebaseApp.configure() when GoogleService-Info.plist is bundled',
  'ios/<App>/Info.plist            display name, camera/photo usage descriptions, remote-notification mode, UIAppFonts',
  'ios/<App>.xcodeproj             GolosText fonts added to the app target resources',
  'android/app/src/main/assets/fonts  GolosText fonts',
];

/** Extra native edits made for the selected social login providers. */
export function socialNativeChanges(options: Pick<ProjectOptions, 'socialAuth'>): string[] {
  const p = socialProviders(options.socialAuth);
  return [
    ...(p.facebook
      ? [
          'android/app/src/main/res/values/strings.xml  Facebook app id / client token placeholders',
          'android/app/src/main/AndroidManifest.xml   Facebook SDK meta-data, CustomTabActivity, <queries>',
          'ios/<App>/AppDelegate.swift     Facebook SDK launch + open URL handler',
        ]
      : []),
    ...(p.google || p.facebook
      ? [`ios/<App>/Info.plist            ${[p.google && 'Google URL scheme', p.facebook && 'Facebook keys, fb URL scheme, query schemes'].filter(Boolean).join(', ')}`]
      : []),
    ...(p.apple ? ['ios/<App>/<App>.entitlements    Sign in with Apple (linked via CODE_SIGN_ENTITLEMENTS)'] : []),
  ];
}

/** Everything that would be generated, without touching the disk. */
export async function describeDryRun(options: ProjectOptions): Promise<string> {
  const prepared = prepareGeneration(options);
  await renderPlan(prepared); // proves every template renders
  const profile = getProfile(options.reactNativeVersion);
  const deps = resolveDependencies(profile, options);
  const arch = prepared.ctx.architecture;

  const lines = [
    chalk.bold('Architecture:'),
    arch.name,
    '',
    chalk.bold('State management:'),
    STATE_MANAGEMENT_LABELS[options.stateManagement],
    '',
    chalk.bold('Options:'),
    `API requests: ${options.apiEncryption ? 'encrypted (AES-256, crypto-js)' : 'plain JSON'}`,
    `RTL support: ${options.rtl ? 'yes (Arabic sample language)' : 'no'}`,
    `Theme context: ${options.themeContext ? 'yes (light / dark / system)' : 'no (static light theme)'}`,
    `Push notifications: ${options.notifications ? 'yes (FCM + Notifee)' : 'no'}`,
    `Storage: ${STORAGE_LABELS[options.storage]}`,
    `Firebase Analytics: ${options.analytics ? 'yes (screen tracking + analyticsService)' : 'no'}`,
    `Vector icons: ${options.vectorIcons ? 'yes (MaterialDesignIcons, iOS UIAppFonts configured)' : 'no'}`,
    `Drawer: ${options.drawer ? 'yes (side drawer around the bottom tabs)' : 'no (bottom tabs only)'}`,
    `Social login: ${SOCIAL_LOGIN_CHOICES.find(c => c.value === options.socialAuth)?.label ?? options.socialAuth}`,
    '',
    chalk.bold('Project:'),
    `${options.appName} (${options.packageName}) → ${options.parentDir}/${options.directoryName ?? options.appName}`,
    `React Native ${profile.reactNative} via @react-native-community/cli@${profile.cli}`,
    '',
    chalk.bold('Structure:'),
    architectureTree(prepared.plan, 4),
    '',
    chalk.bold('Files:'),
    ...allPlannedPaths(prepared.plan).map(p => chalk.green(`+ ${p}`)),
    '',
    chalk.bold('Native changes:'),
    ...[...NATIVE_CHANGES, ...socialNativeChanges(options)].map(c => chalk.yellow(`~ ${c}`)),
    '',
    chalk.bold('Dependencies:'),
    ...Object.entries(deps.dependencies).map(([n, v]) => `  ${n}@${v}`),
    chalk.bold('Dev dependencies:'),
    ...Object.entries(deps.devDependencies).map(([n, v]) => `  ${n}@${v}`),
    '',
    chalk.dim('Dry run – nothing was written.'),
  ];
  return lines.join('\n');
}
