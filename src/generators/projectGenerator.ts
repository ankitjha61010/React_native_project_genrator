import path from 'node:path';
import fs from 'fs-extra';
import { assertCompatible, assertNodeVersion, getProfile } from '../config/compatibility.js';
import { prepareGeneration } from '../core/context.js';
import type { ProjectOptions } from '../core/types.js';
import { log, step } from '../cli/logger.js';
import { GeneratorError, explainSystemError } from '../utils/errors.js';
import { assertCommand } from '../utils/exec.js';
import { generateArchitecture } from './architectureGenerator.js';
import { installDependencies, installPods, updateAppJson, updatePackageJson } from './dependencyGenerator.js';
import { renderPlan } from './fileGenerator.js';
import { generateFirebase } from './firebaseGenerator.js';
import { initGit } from './gitGenerator.js';
import { generateNavigation, generateScreens } from './navigationGenerator.js';
import { generateNotifications } from './notificationGenerator.js';
import { generateSocialAuth } from './socialAuthGenerator.js';
import { configureAndroidLayoutDirection, installAndroidFonts } from './native/android.js';
import { configureXcodeEnv, linkIosFonts, VECTOR_ICON_FONTS } from './native/ios.js';
import { initReactNativeProject } from './reactNativeInit.js';

/** Files of the React Native template that the generated project replaces. */
const OBSOLETE_TEMPLATE_FILES = ['__tests__/App.test.tsx', '.eslintrc.js', '.prettierrc.js'];

export interface GenerationHooks {
  /** Replaces the React Native CLI init (used by tests / verification scripts). */
  initProject?: typeof initReactNativeProject;
}

export interface GenerationSummary {
  projectDir: string;
  dependenciesInstalled: boolean;
  podsInstalled: boolean;
  warnings: string[];
}

async function preflight(options: ProjectOptions, projectDir: string): Promise<void> {
  if (!['darwin', 'linux', 'win32'].includes(process.platform)) {
    throw new GeneratorError(`Unsupported platform "${process.platform}".`, {
      reason: 'React Native development is supported on macOS, Linux and Windows.',
    });
  }
  await assertCommand('npm', 'Install Node.js (which includes npm) from https://nodejs.org');
  await assertCommand('npx', 'Install Node.js (which includes npx) from https://nodejs.org');

  try {
    await fs.ensureDir(options.parentDir);
    await fs.access(options.parentDir, fs.constants.W_OK);
  } catch (error) {
    throw explainSystemError(`write to ${options.parentDir}`, error);
  }

  if ((await fs.pathExists(projectDir)) && (await fs.readdir(projectDir)).length > 0 && !options.overwrite) {
    throw new GeneratorError(`The directory ${projectDir} already exists and is not empty.`, {
      tryHints: ['Choose another name/location, or confirm overwriting it.'],
    });
  }
}

export async function generateProject(options: ProjectOptions, hooks: GenerationHooks = {}): Promise<GenerationSummary> {
  const profile = getProfile(options.reactNativeVersion);
  assertNodeVersion(profile);
  assertCompatible(profile);

  const projectDir = path.join(options.parentDir, options.directoryName ?? options.appName);
  const prepared = prepareGeneration(options);
  const arch = prepared.ctx.architecture;
  // Render everything up-front: a template problem fails before anything is written.
  const files = await renderPlan(prepared);
  await preflight(options, projectDir);

  log.newline();
  const summary: GenerationSummary = { projectDir, dependenciesInstalled: false, podsInstalled: false, warnings: [] };
  let created = false;

  try {
    await step(
      'Creating React Native project',
      async () => {
        if (options.overwrite) {
          await fs.remove(projectDir);
        }
        created = true;
        await (hooks.initProject ?? initReactNativeProject)(projectDir, options, profile);
        await Promise.all(OBSOLETE_TEMPLATE_FILES.map(file => fs.remove(path.join(projectDir, file))));
        await configureXcodeEnv(projectDir, options.appName);
        await configureAndroidLayoutDirection(projectDir, options.rtl);
      },
      `React Native ${profile.reactNative} project created`,
    );

    await step('Creating architecture', () => generateArchitecture(projectDir, files), `${arch.name} generated`);

    const fontPaths = files.filter(f => f.id?.startsWith('assets.font.')).map(f => f.path);
    await step(
      'Linking fonts',
      async () => {
        await installAndroidFonts(projectDir, fontPaths);
        await linkIosFonts(projectDir, options.appName, fontPaths, options.vectorIcons ? VECTOR_ICON_FONTS : []);
      },
      options.vectorIcons ? 'GolosText + MaterialDesignIcons fonts linked (Android & iOS)' : 'GolosText fonts linked (Android & iOS)',
    );

    await step(
      'Adding dependencies',
      async () => {
        await updateAppJson(projectDir, options);
        return updatePackageJson(projectDir, options, profile);
      },
      result =>
      `${result.added.length} dependencies added to package.json`,
    );

    await step('Configuring navigation', () => generateNavigation(projectDir, files), 'Navigation configured');

    await step('Configuring Firebase', () => generateFirebase(projectDir, files, options, profile), result =>
      result.android === 'installed' || result.ios === 'installed'
        ? `Firebase configured (Android: ${result.android}, iOS: ${result.ios})`
        : 'Firebase template generated (see firebase/README.md)',
    );

    if (options.notifications) {
      await step('Configuring notifications', () => generateNotifications(projectDir, files, options), 'Notification service generated');
    }

    if (options.socialAuth !== 'none') {
      await step('Configuring social login', () => generateSocialAuth(projectDir, options), providers =>
        `Social login configured (${providers.join(', ')}) – add your keys, see docs/SOCIAL_LOGIN.md`,
      );
    }

    const screens = await step('Creating screens', () => generateScreens(projectDir, files), 'Screens created');
    screens.forEach(name => log.success(`${name} screen`));
  } catch (error) {
    if (created) {
      await fs.remove(projectDir).catch(() => undefined);
      log.warn(`Rolled back: removed ${projectDir}`);
    }
    throw error;
  }

  // From here on the project is complete; failures are reported, not rolled back.
  if (options.installDependencies) {
    try {
      await step('Installing dependencies', () => installDependencies(projectDir), 'Dependencies installed');
      summary.dependenciesInstalled = true;
    } catch (error) {
      log.error(error);
      summary.warnings.push('Dependencies are NOT installed – run `npm install` in the project.');
    }
  }

  if (options.installPods && summary.dependenciesInstalled) {
    try {
      await step('Installing CocoaPods', () => installPods(projectDir), 'CocoaPods installed');
      summary.podsInstalled = true;
    } catch (error) {
      log.error(error);
      summary.warnings.push('CocoaPods are NOT installed – run `cd ios && bundle exec pod install`.');
    }
  }

  if (options.initGit) {
    try {
      const result = await step('Initializing git', () => initGit(projectDir), r =>
        r === 'committed' ? 'Git repository initialized' : r === 'initialized' ? 'Git repository initialized (no commit: set git user.name/email)' : 'Git not found – skipped',
      );
      if (result === 'unavailable') summary.warnings.push('git was not found, the repository was not initialized.');
    } catch (error) {
      summary.warnings.push(`Git initialization failed: ${(error as Error).message}`);
    }
  }

  return summary;
}
