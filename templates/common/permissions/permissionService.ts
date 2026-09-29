import { Platform } from 'react-native';
import {
  checkNotifications,
  check,
  openSettings,
  PERMISSIONS,
  request,
  requestNotifications,
  RESULTS,
  type Permission,
  type PermissionStatus,
} from 'react-native-permissions';

/**
 * App level permission names. Add new ones here and:
 *  - iOS: add the matching entry to `setup_permissions([...])` in ios/Podfile and a
 *    usage description (NS…UsageDescription) to Info.plist,
 *  - Android: add the <uses-permission> to AndroidManifest.xml.
 */
export type AppPermission = 'camera' | 'photoLibrary'{{#if CHAT}} | 'microphone'{{/if}};

// `undefined` means "no runtime permission needed on this platform".
const PERMISSION_MAP: Record<AppPermission, Permission | undefined> = {
  camera: Platform.select({ ios: PERMISSIONS.IOS.CAMERA, android: PERMISSIONS.ANDROID.CAMERA }),
  // react-native-image-picker uses the system photo pickers (PHPicker on iOS, Photo Picker on
  // Android), which need no runtime permission. Map it if you access the library directly.
  photoLibrary: undefined,
{{#if CHAT}}
  // Chat voice messages.
  microphone: Platform.select({ ios: PERMISSIONS.IOS.MICROPHONE, android: PERMISSIONS.ANDROID.RECORD_AUDIO }),
{{/if}}
};

export type { PermissionStatus };

function isUsable(status: PermissionStatus): boolean {
  return status === RESULTS.GRANTED || status === RESULTS.LIMITED;
}

export const permissionService = {
  async check(permission: AppPermission): Promise<PermissionStatus> {
    const native = PERMISSION_MAP[permission];
    return native ? check(native) : RESULTS.GRANTED;
  },

  async request(permission: AppPermission): Promise<PermissionStatus> {
    const native = PERMISSION_MAP[permission];
    return native ? request(native) : RESULTS.GRANTED;
  },

  /**
   * Checks and, if needed, requests a permission.
   * Resolves `true` when the feature can be used. `blocked` means the user must
   * enable it in Settings – call `permissionService.openSettings()`.
   */
  async ensure(permission: AppPermission): Promise<boolean> {
    const current = await permissionService.check(permission);
    if (isUsable(current)) {
      return true;
    }
    if (current !== RESULTS.DENIED) {
      return false; // blocked or unavailable – asking again won't show a dialog
    }
    return isUsable(await permissionService.request(permission));
  },

  /** Notification permission (iOS + Android 13+ POST_NOTIFICATIONS). */
  async checkNotifications(): Promise<PermissionStatus> {
    const { status } = await checkNotifications();
    return status;
  },

  async requestNotifications(): Promise<boolean> {
    const { status } = await requestNotifications(['alert', 'badge', 'sound']);
    return isUsable(status);
  },

  openSettings: () => openSettings(),
};
