import type { ReactNativeProfile } from '../config/reactNativeVersions.js';
import type { ProjectOptions } from '../core/types.js';
import type { RenderedFile } from './fileGenerator.js';
import { writeFiles } from './fileGenerator.js';
import { configureAndroidFirebase, installGoogleServicesJson } from './native/android.js';
import { configureAppDelegate, configurePodfile, installGoogleServiceInfoPlist } from './native/ios.js';

export interface FirebaseResult {
  android: 'installed' | 'example';
  ios: 'installed' | 'example';
}

/**
 * Firebase JS service, example config files + docs, Gradle plugin, Podfile and
 * AppDelegate. Real config files are copied only when the user supplied them.
 */
export async function generateFirebase(
  projectDir: string,
  files: RenderedFile[],
  options: ProjectOptions,
  profile: ReactNativeProfile,
): Promise<FirebaseResult> {
  await writeFiles(
    projectDir,
    files.filter(f => f.group === 'firebase' || /^root\.(firebase|iosEntitlements)/.test(f.id ?? '')),
  );

  await configureAndroidFirebase(projectDir, profile);
  await configurePodfile(projectDir, options.appName, [...(options.chat ? ['Microphone'] : []), ...(options.googleLocation ? ['LocationWhenInUse'] : [])]);
  await configureAppDelegate(projectDir, options.appName);

  const result: FirebaseResult = { android: 'example', ios: 'example' };
  if (options.firebase.androidConfigPath) {
    await installGoogleServicesJson(projectDir, options.firebase.androidConfigPath);
    result.android = 'installed';
  }
  if (options.firebase.iosConfigPath) {
    await installGoogleServiceInfoPlist(projectDir, options.appName, options.firebase.iosConfigPath);
    result.ios = 'installed';
  }
  return result;
}
