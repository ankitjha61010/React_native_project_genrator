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
function deviceName(): string | null {
  if (Platform.OS === 'android') return [Platform.constants.Brand, Platform.constants.Model].filter(Boolean).join(' ') || null;
  if (Platform.OS === 'ios') return Platform.constants.interfaceIdiom === 'pad' ? 'iPad' : 'iPhone';
  return null;
}

/** Everything the backend stores about this device (POST /devices). */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  return {
    deviceId: await getDeviceId(),
    token: await getFcmToken(),
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    deviceName: deviceName(),
    osVersion: String(Platform.Version),
    appVersion: appConfig.version,
  };
}

/**
 * Registers / updates this device for the signed-in user: after every sign-in, on app start
 * and when the FCM token changes. Never throws – the app works without it.
 */
export async function registerDevice(token?: string): Promise<void> {
  try {
    const device = await getDeviceInfo();
    await deviceApi.register(token ? { ...device, token } : device);
    logger.debug('Device registered');
  } catch (error) {
    logger.warn('Registering the device failed', error);
  }
}
