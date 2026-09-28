import { socialProviders } from '../config/socialAuth.js';
import type { ProjectOptions } from '../core/types.js';
import { configureAndroidSocialAuth } from './native/android.js';
import { configureIosSocialAuth } from './native/ios.js';

/**
 * Native setup for the selected social login providers. The JS side (socialAuthService,
 * login buttons, docs) is part of the file plan; this only patches Android / iOS files.
 */
export async function generateSocialAuth(projectDir: string, options: ProjectOptions): Promise<string[]> {
  const providers = socialProviders(options.socialAuth);
  await configureAndroidSocialAuth(projectDir, providers);
  await configureIosSocialAuth(projectDir, options.appName, options.displayName, providers);
  return (Object.keys(providers) as Array<keyof typeof providers>).filter(p => providers[p]);
}
