import fs from 'fs-extra';
import plist from 'plist';
import { GeneratorError } from './errors.js';

interface GoogleServicesJson {
  project_info?: { project_id?: string };
  client?: Array<{ client_info?: { android_client_info?: { package_name?: string } } }>;
}

/** Validates google-services.json and that it contains a client for the package name. */
export async function validateGoogleServicesJson(filePath: string, packageName: string): Promise<void> {
  if (!(await fs.pathExists(filePath))) {
    throw new GeneratorError(`google-services.json not found at ${filePath}.`);
  }
  let json: GoogleServicesJson;
  try {
    json = JSON.parse(await fs.readFile(filePath, 'utf8')) as GoogleServicesJson;
  } catch (error) {
    throw new GeneratorError('Invalid Firebase file: google-services.json is not valid JSON.', {
      reason: (error as Error).message,
    });
  }
  if (!json.project_info?.project_id || !Array.isArray(json.client)) {
    throw new GeneratorError('Invalid Firebase file: this does not look like a google-services.json.', {
      tryHints: ['Download it from Firebase console → Project settings → Your apps → Android.'],
    });
  }
  const packages = json.client.map(c => c.client_info?.android_client_info?.package_name).filter(Boolean);
  if (!packages.includes(packageName)) {
    throw new GeneratorError(`google-services.json has no Android app for "${packageName}".`, {
      reason: `It contains: ${packages.join(', ') || 'no Android apps'}.`,
      tryHints: [`Register an Android app with package name ${packageName} in Firebase and download the file again.`],
    });
  }
}

/** Validates GoogleService-Info.plist. Returns non fatal warnings. */
export async function validateGoogleServiceInfoPlist(filePath: string, bundleId: string): Promise<string[]> {
  if (!(await fs.pathExists(filePath))) {
    throw new GeneratorError(`GoogleService-Info.plist not found at ${filePath}.`);
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = plist.parse(await fs.readFile(filePath, 'utf8')) as Record<string, unknown>;
  } catch (error) {
    throw new GeneratorError('Invalid Firebase file: GoogleService-Info.plist could not be parsed.', {
      reason: (error as Error).message,
    });
  }
  if (typeof parsed.GOOGLE_APP_ID !== 'string' || typeof parsed.PROJECT_ID !== 'string') {
    throw new GeneratorError('Invalid Firebase file: GOOGLE_APP_ID / PROJECT_ID missing in GoogleService-Info.plist.');
  }
  const warnings: string[] = [];
  if (parsed.BUNDLE_ID !== bundleId) {
    warnings.push(
      `GoogleService-Info.plist is for bundle id "${String(parsed.BUNDLE_ID)}", the app uses "${bundleId}". Push notifications will not work until they match.`,
    );
  }
  return warnings;
}
