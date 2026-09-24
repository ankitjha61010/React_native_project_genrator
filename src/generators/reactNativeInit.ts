import path from 'node:path';
import type { ReactNativeProfile } from '../config/reactNativeVersions.js';
import type { ProjectOptions } from '../core/types.js';
import { GeneratorError, explainSystemError } from '../utils/errors.js';
import { CommandError, run } from '../utils/exec.js';

/** Creates the native project with the official React Native Community CLI. */
export async function initReactNativeProject(
  projectDir: string,
  options: ProjectOptions,
  profile: ReactNativeProfile,
): Promise<void> {
  const args = [
    '--yes',
    `@react-native-community/cli@${profile.cli}`,
    'init',
    options.appName,
    '--version',
    profile.reactNative,
    '--package-name',
    options.packageName,
    '--title',
    options.displayName,
    '--directory',
    projectDir,
    '--pm',
    'npm',
    '--skip-install',
    '--skip-git-init',
    '--install-pods',
    'false',
  ];
  try {
    await run('npx', args, { cwd: path.dirname(projectDir) });
  } catch (error) {
    if (error instanceof CommandError) {
      const network = /ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|network/i.test(error.output);
      throw new GeneratorError('React Native initialization failed.', {
        reason: error.output,
        tryHints: network
          ? ['Check your internet connection / npm proxy settings and try again.']
          : [`npx @react-native-community/cli@${profile.cli} init ${options.appName} --version ${profile.reactNative}`],
        cause: error,
      });
    }
    throw explainSystemError('create the React Native project', error);
  }
}
