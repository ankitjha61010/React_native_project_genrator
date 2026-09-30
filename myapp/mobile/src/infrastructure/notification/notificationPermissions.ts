import { permissionService } from '@infrastructure/permissions/permissionService';

/**
 * Asks for notification permission.
 * - iOS: shows the system alert (requires the Push Notifications capability, see firebase/README.md).
 * - Android 13+: requests POST_NOTIFICATIONS (declared in AndroidManifest.xml).
 * - Android ≤ 12: granted by default.
 */
export function requestNotificationPermission(): Promise<boolean> {
  return permissionService.requestNotifications();
}

export async function hasNotificationPermission(): Promise<boolean> {
  const status = await permissionService.checkNotifications();
  return status === 'granted' || status === 'limited';
}
