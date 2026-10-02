import path from 'node:path';
import fs from 'fs-extra';
import { resolveDependencies } from '../config/compatibility.js';
import type { ReactNativeProfile } from '../config/reactNativeVersions.js';
import type { ProjectOptions } from '../core/types.js';
import { GeneratorError } from '../utils/errors.js';
import { CommandError, commandExists, run } from '../utils/exec.js';

const SCRIPTS: Record<string, string> = {
  lint: 'eslint .',
  'lint:fix': 'eslint . --fix',
  format: 'prettier --write .',
  'format:check': 'prettier --check .',
  typecheck: 'tsc --noEmit',
  'pods': 'cd ios && bundle install && bundle exec pod install',
};

/** Signed OTA update archives (scripts/ota-bundle.mjs). */
const OTA_SCRIPTS: Record<string, string> = {
  'ota:android': 'node scripts/ota-bundle.mjs --platform android',
  'ota:ios': 'node scripts/ota-bundle.mjs --platform ios',
};

function sortKeys(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

/** Adds dependencies + scripts to the package.json created by the React Native CLI. */
export async function updatePackageJson(
  projectDir: string,
  options: ProjectOptions,
  profile: ReactNativeProfile,
): Promise<{ added: string[] }> {
  const file = path.join(projectDir, 'package.json');
  const pkg = (await fs.readJson(file)) as {
    name?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  if (pkg.dependencies?.['react-native'] !== profile.reactNative) {
    throw new GeneratorError('The React Native CLI created an unexpected project.', {
      reason: `Expected react-native ${profile.reactNative}, found ${pkg.dependencies?.['react-native'] ?? 'none'}.`,
    });
  }

  const resolved = resolveDependencies(profile, options);
  // The RN template's welcome screen package is replaced by our screens.
  delete pkg.dependencies['@react-native/new-app-screen'];

  pkg.name = options.appName.toLowerCase();
  pkg.scripts = { ...pkg.scripts, ...SCRIPTS, ...(options.ota ? OTA_SCRIPTS : {}) };
  pkg.dependencies = sortKeys({ ...pkg.dependencies, ...resolved.dependencies });
  pkg.devDependencies = sortKeys({ ...pkg.devDependencies, ...resolved.devDependencies });

  await fs.writeJson(file, pkg, { spaces: 2 });
  return { added: [...Object.keys(resolved.dependencies), ...Object.keys(resolved.devDependencies)] };
}

/** app.json `displayName` is what the RN CLI uses for the launcher label on some tools. */
export async function updateAppJson(projectDir: string, options: ProjectOptions): Promise<void> {
  const file = path.join(projectDir, 'app.json');
  const appJson = (await fs.readJson(file)) as Record<string, unknown>;
  appJson.name = options.appName;
  appJson.displayName = options.displayName;
  await fs.writeJson(file, appJson, { spaces: 2 });
}

export async function installDependencies(projectDir: string): Promise<void> {
  try {
    await run('npm', ['install', '--no-audit', '--no-fund'], { cwd: projectDir });
  } catch (error) {
    throw new GeneratorError('Failed to install dependencies.', {
      reason: error instanceof CommandError ? error.output : String(error),
      tryHints: [`cd ${projectDir}`, 'npm install'],
      cause: error,
    });
  }
}

export async function installPods(projectDir: string): Promise<void> {
  const ios = path.join(projectDir, 'ios');
  try {
    if (await commandExists('bundle')) {
      await run('bundle', ['install'], { cwd: projectDir });
      await run('bundle', ['exec', 'pod', 'install'], { cwd: ios });
    } else {
      await run('pod', ['install'], { cwd: ios });
    }
  } catch (error) {
    throw new GeneratorError('Failed to install CocoaPods.', {
      reason: error instanceof CommandError ? error.output : String(error),
      tryHints: [`cd ${ios}`, 'bundle install && bundle exec pod install'],
      cause: error,
    });
  }
}
