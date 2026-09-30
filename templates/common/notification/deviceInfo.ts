import { Platform } from 'react-native';
import { deviceApi, type DeviceInfo } from '{{IMPORT:api.device}}';
import { StorageKeys } from '{{IMPORT:storage.keys}}';
import { storageService } from '{{IMPORT:storage.service}}';
import { appConfig } from '{{IMPORT:config.app}}';
import { logger } from '{{IMPORT:utils.logger}}';
import { getFcmToken } from './notificationToken';

/** 32 random hex characters. */
function randomId(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/** Identifies this app install – created once and kept until the app is uninstalled. */
export async function getDeviceId(): Promise<string> {
  const saved = await storageService.get<string>(StorageKeys.DEVICE_ID);
  if (saved) return saved;
  const id = randomId();
  await storageService.set(StorageKeys.DEVICE_ID, id);
  return id;
}

/** e.g. "Google Pixel 8" on Android; "iPhone" / "iPad" on iOS (the exact model needs a native module). */
function deviceModel(): string | null {
  if (Platform.OS === 'android') return [Platform.constants.Brand, Platform.constants.Model].filter(Boolean).join(' ') || null;
  if (Platform.OS === 'ios') return Platform.constants.interfaceIdiom === 'pad' ? 'iPad' : 'iPhone';
  return null;
}

/**
 * The `device` of the sign-in / refresh bodies (authApi.ts). The FCM token sent here is
 * remembered, so syncFcmToken() only calls the backend when the token really changed.
 */
export async function getSignInDevice(): Promise<DeviceInfo> {
  const fcmToken = await getFcmToken();
  if (fcmToken) await storageService.set(StorageKeys.FCM_TOKEN, fcmToken);
  return {
    deviceId: await getDeviceId(),
    deviceType: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    deviceModel: deviceModel(),
    osVersion: String(Platform.Version),
    appVersion: appConfig.version,
    fcmToken,
  };
}

/**
 * Sends the FCM token when it differs from the one the backend has: FCM rotated it, or it only
 * became available after sign-in (e.g. iOS gets it once notifications are allowed). Never throws.
 */
export async function syncFcmToken(token?: string): Promise<void> {
  try {
    const fcmToken = token ?? (await getFcmToken());
    if (!fcmToken || fcmToken === (await storageService.get<string>(StorageKeys.FCM_TOKEN))) return;
    await deviceApi.updateFcmToken(await getDeviceId(), fcmToken);
    await storageService.set(StorageKeys.FCM_TOKEN, fcmToken);
    logger.debug('FCM token updated');
  } catch (error) {
    logger.warn('Updating the FCM token failed', error);
  }
}

/** On logout: the next sign-in sends the token again. */
export function forgetFcmToken(): Promise<void> {
  return storageService.remove(StorageKeys.FCM_TOKEN);
}
