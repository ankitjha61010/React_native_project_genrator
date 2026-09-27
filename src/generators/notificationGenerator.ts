import type { ProjectOptions } from '../core/types.js';
import type { RenderedFile } from './fileGenerator.js';
import { writeFiles } from './fileGenerator.js';
import { configureAndroidPermissions, setAndroidDisplayName } from './native/android.js';
import { configureInfoPlist } from './native/ios.js';

/** Notification service files + Android permissions and iOS Info.plist entries. */
export async function generateNotifications(
  projectDir: string,
  files: RenderedFile[],
  options: ProjectOptions,
): Promise<void> {
  if (!options.notifications) return;

  await writeFiles(
    projectDir,
    files.filter(f => f.group === 'notification'),
  );
  await configureAndroidPermissions(projectDir);
  await setAndroidDisplayName(projectDir, options.displayName);
  await configureInfoPlist(projectDir, options.appName, options.displayName);
}
