import { getApps } from '@react-native-firebase/app';
import { logger } from '{{IMPORT:utils.logger}}';

/**
 * True when google-services.json / GoogleService-Info.plist are installed and the
 * native Firebase app was initialised. Every Firebase call in the app is guarded by
 * this, so the project keeps running before Firebase is set up (see firebase/README.md).
 */
export function isFirebaseConfigured(): boolean {
  try {
    return getApps().length > 0;
  } catch {
    return false;
  }
}

let warned = false;

/** Logs once that Firebase features are disabled until the config files are installed. */
export function warnFirebaseNotConfigured(): void {
  if (!warned) {
    warned = true;
    logger.warn('Firebase is not configured – Firebase features are disabled. See firebase/README.md.');
  }
}
