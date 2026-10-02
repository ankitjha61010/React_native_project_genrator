import { NativeModules, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';
import DeviceInfo from 'react-native-device-info';
import RNRestart from 'react-native-restart';
import { api } from '{{IMPORT:api.client}}';
import { storageService } from '{{IMPORT:storage.service}}';
import { StorageKeys } from '{{IMPORT:storage.keys}}';
import type { DownloadOptions, OTAError, OTAMetadata, OTAUpdateInfo } from '../types/ota.types';

const { OTAManager } = NativeModules;

const OTA_URLS = {
  CHECK: '/ota/check',
  DOWNLOAD_EVENT: '/ota/download-event',
};

const otaDownloadFolderPath = `${RNFS.DocumentDirectoryPath}/ota_download`;
const otaBundleFolderPath = `${RNFS.DocumentDirectoryPath}/ota_bundle`;

const otaError = (code: string, message: string): OTAError =>
  Object.assign(new Error(message), { code });

export const formatBytes = (bytes?: number | null): string => {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
};

const ERROR_MESSAGES: Record<string, string> = {
  CELLULAR_CONFIRMATION_REQUIRED: 'This update is large — confirm before downloading over cellular data.',
  INSUFFICIENT_STORAGE: 'Not enough free storage on this device to download the update.',
  DOWNLOAD_FAILED: 'The update server could not be reached. Please try again.',
  DOWNLOAD_CANCELLED: 'Download cancelled.',
  NETWORK_ERROR: 'Network interrupted during download. Please try again.',
  SHA256_MISMATCH: 'The downloaded update looks corrupted (hash mismatch). Please try again.',
  SIGNATURE_INVALID: 'The downloaded update failed a security check (signature invalid). Please try again.',
  FILE_READ_ERROR: 'Could not read the downloaded update file. Please try again.',
  APPLY_FAILED: 'Failed to apply the update bundle. Please try again.',
  INVALID_METADATA: 'Invalid update metadata received. Please try again.',
  UNZIP_FAILED: 'Failed to extract the update package. Please try again.',
};

export const errorMessageFor = (error: any): string => {
  try {
    if (!error) return 'Something went wrong updating the app. Please try again.';
    let code: string | null = null;
    let message = '';

    if (typeof error === 'string') {
      message = error;
    } else if (typeof error === 'object' && error !== null) {
      code = error.code || error.userInfo?.code || null;
      message = error.message || error.description || String(error);
    }

    if (code && ERROR_MESSAGES[code]) {
      return ERROR_MESSAGES[code];
    }

    const combined = `${code || ''} ${message}`.toLowerCase();
    if (combined.includes('signature') || combined.includes('tamper') || combined.includes('security')) {
      return 'The downloaded update failed a security check (signature invalid). Please try again.';
    }
    if (combined.includes('sha256') || combined.includes('sha-256') || combined.includes('mismatch') || combined.includes('hash')) {
      return 'The downloaded update looks corrupted (hash mismatch). Please try again.';
    }
    if (combined.includes('unzip') || combined.includes('zip') || combined.includes('extract')) {
      return 'Failed to extract the update package. Please try again.';
    }
    if (combined.includes('storage') || combined.includes('space') || combined.includes('insufficient')) {
      return 'Not enough free storage on this device to download the update.';
    }
    if (combined.includes('timed') || combined.includes('timeout')) {
      return 'The download timed out. Please try again.';
    }
    if (combined.includes('network') || combined.includes('connect') || combined.includes('internet')) {
      return 'Network interrupted during download. Please try again.';
    }
    if (combined.includes('404') || combined.includes('not found') || combined.includes('download_failed')) {
      return 'The update package could not be found on the server. Please try again.';
    }
  } catch (e) {
    // Fallback
  }
  return 'Something went wrong updating the app. Please try again.';
};

const ensureDirExists = async (path: string): Promise<void> => {
  const exists = await RNFS.exists(path);
  if (!exists) {
    await RNFS.mkdir(path);
  }
};

const deleteFolder = async (path: string): Promise<void> => {
  const exists = await RNFS.exists(path);
  if (exists) {
    await RNFS.unlink(path).catch(() => undefined);
  }
};

const ROLLBACK_REPORTED_KEY = '@ota/rollback_reported';

const reportRollbackIfNeeded = async (metadata: any) => {
  if (metadata?.status !== 'rolled_back' || !metadata.ota_version) return;
  try {
    const marker = `${metadata.ota_version}:${metadata.rolled_back_at ?? ''}`;
    const alreadyReported = await storageService.get<string>(ROLLBACK_REPORTED_KEY as any);
    if (alreadyReported === marker) return;

    await reportDownloadEvent(metadata.ota_version, 'rollback');
    await storageService.set(ROLLBACK_REPORTED_KEY as any, marker);
  } catch (error) {
    // Best effort
  }
};

export const isTruthy = (val: unknown): boolean =>
  val === true || val === 1 || val === '1' || val === 'true';

/**
 * Checks the backend for available OTA updates matching current app and platform.
 */
export const checkForUpdate = async (): Promise<OTAUpdateInfo | null> => {
  if (!OTAManager) {
    return null;
  }

  const metadata = (await OTAManager.getCurrentMetadata?.()) ?? { ota_version: 0, status: 'no_ota' };
  const deviceId = (await OTAManager.getDeviceId?.()) ?? '';

  reportRollbackIfNeeded(metadata);

  const activeOtaVersion =
    metadata.status === 'rolled_back' || metadata.status === 'no_ota'
      ? 0
      : (metadata.ota_version ?? 0);

  const appVersion = DeviceInfo.getVersion() || '1.0.0';

  const params: Record<string, string | number> = {
    native_version: appVersion,
    ota_version: activeOtaVersion,
    device_id: deviceId,
    platform: Platform.OS,
    ota_status: metadata.status ?? '',
  };

  try {
    // `api.get` already unwraps the response envelope.
    const data = await api.get<OTAUpdateInfo>(OTA_URLS.CHECK, { params });
    if (!data) return null;

    const isUpdateAvailable = isTruthy(data?.update_available);
    const isRevertToEmbedded = isTruthy(data?.revert_to_embedded);

    if (isRevertToEmbedded) {
      try {
        await OTAManager.performRollback?.();
      } catch (error) {
        // Rollback failed
      }
      restartApp();
      return { ...data, revert_to_embedded: true, update_available: false };
    }

    if (!isUpdateAvailable) {
      return { ...data, update_available: false };
    }

    return {
      ...data,
      update_available: true,
      force_update: isTruthy(data.force_update),
      bundle_size: Number(data.bundle_size || 0),
      ota_version: Number(data.ota_version || 0),
    };
  } catch (error) {
    return null;
  }
};

/**
 * Downloads the update bundle zip with progress tracking and storage pre-checks.
 */
export const downloadBundle = async (
  updateInfo: OTAUpdateInfo,
  { onProgress, allowCellular = false, jobIdRef }: DownloadOptions = {},
): Promise<string> => {
  if (!OTAManager) {
    throw otaError('DOWNLOAD_FAILED', 'OTAManager native module is not available');
  }
  const { bundle_url, bundle_size = 0 } = updateInfo;
  if (!bundle_url) {
    throw otaError('DOWNLOAD_FAILED', 'Bundle URL is missing');
  }

  const [networkType, wifiWarningThreshold, availableStorage] = await Promise.all([
    OTAManager.getNetworkType?.() ?? Promise.resolve('wifi'),
    OTAManager.getWiFiWarningThreshold?.() ?? Promise.resolve(50 * 1024 * 1024),
    OTAManager.getAvailableStorage?.() ?? Promise.resolve(Number.MAX_SAFE_INTEGER),
  ]);

  if (networkType === 'cellular' && bundle_size > wifiWarningThreshold && !allowCellular) {
    throw otaError(
      'CELLULAR_CONFIRMATION_REQUIRED',
      'Update is large for a cellular connection — confirm before downloading',
    );
  }

  if (availableStorage < bundle_size) {
    throw otaError('INSUFFICIENT_STORAGE', 'Not enough free storage to download the update');
  }

  const filePath = `${otaDownloadFolderPath}/release.zip`;
  await deleteFolder(otaDownloadFolderPath);
  await ensureDirExists(otaDownloadFolderPath);

  const { jobId, promise } = RNFS.downloadFile({
    fromUrl: bundle_url,
    toFile: filePath,
    progressInterval: 200,
    progressDivider: 0,
    connectionTimeout: 15000,
    readTimeout: 30000,
    progress: (res) => {
      const serverContentLength = res.contentLength;
      const totalLength = serverContentLength && serverContentLength > 0
        ? serverContentLength
        : bundle_size && bundle_size > 0 ? bundle_size : 0;

      const calculatedProgress = totalLength > 0
        ? Math.min(Math.max(res.bytesWritten / totalLength, 0), 1)
        : 0;

      onProgress?.({
        progress: calculatedProgress,
        bytesWritten: res.bytesWritten,
        contentLength: totalLength,
      });
    },
  });

  if (jobIdRef) jobIdRef.current = jobId;

  let result;
  try {
    result = await promise;
  } catch (error: any) {
    await deleteFolder(otaDownloadFolderPath);
    throw otaError('NETWORK_ERROR', error?.message ?? 'Download failed');
  } finally {
    if (jobIdRef) jobIdRef.current = null;
  }

  if (result.statusCode !== 200) {
    await deleteFolder(otaDownloadFolderPath);
    throw otaError('DOWNLOAD_FAILED', `Bundle download failed with status ${result.statusCode}`);
  }

  return filePath;
};

/**
 * Verifies SHA-256 hash and RSA signature of the downloaded bundle zip.
 */
export const verifyBundle = async (filePath: string, updateInfo: OTAUpdateInfo): Promise<void> => {
  if (!OTAManager) {
    throw otaError('SIGNATURE_INVALID', 'OTAManager native module is not available');
  }
  const { sha256, signature } = updateInfo;

  if (sha256 && OTAManager.verifySHA256) {
    await OTAManager.verifySHA256(filePath, sha256);
  }
  if (signature && OTAManager.verifyBundleSignature) {
    await OTAManager.verifyBundleSignature(filePath, signature);
  }
};

/**
 * Extracts bundle into ota_bundle/ and commits metadata natively.
 */
export const applyBundle = async (filePath: string, updateInfo: OTAUpdateInfo): Promise<void> => {
  if (!OTAManager) {
    throw otaError('APPLY_FAILED', 'OTAManager native module is not available');
  }
  const { ota_version, sha256 } = updateInfo;
  const appVersion = DeviceInfo.getVersion() || '1.0.0';

  try {
    await deleteFolder(otaBundleFolderPath);
    await ensureDirExists(otaBundleFolderPath);
    await unzip(filePath, otaBundleFolderPath);

    if (OTAManager.commitMetadata) {
      await OTAManager.commitMetadata({
        ota_version,
        native_version: appVersion,
        status: 'applied',
        sha256,
        applied_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    await deleteFolder(otaBundleFolderPath);
    throw error;
  } finally {
    await deleteFolder(otaDownloadFolderPath);
  }
};

/**
 * Clears native crash sentinel once the JS component tree mounts cleanly.
 */
export const markLaunchSuccessful = (): void => {
  OTAManager?.markSuccessfulLaunch?.();
};

/**
 * Returns current metadata of active OTA bundle.
 */
export const getCurrentOTAMetadata = async (): Promise<OTAMetadata> =>
  OTAManager?.getCurrentMetadata?.() ?? Promise.resolve({ ota_version: 0, status: 'no_ota' });

/**
 * Reverts to embedded release bundle on next cold launch.
 */
export const rollback = async (): Promise<boolean> => {
  await OTAManager?.performRollback?.();
  return true;
};

/**
 * Reboots the React Native app to load the new bundle.
 */
export const restartApp = (): void => {
  try {
    if (RNRestart?.Restart) {
      RNRestart.Restart();
      return;
    }
    if ((RNRestart as any)?.restart) {
      (RNRestart as any).restart();
      return;
    }
  } catch (e) {
    // Restart fallback
  }
};

/**
 * Reports download or installation events to backend analytics.
 */
export const reportDownloadEvent = async (otaVersion: number | undefined, event: string): Promise<void> => {
  if (!OTAManager) return;
  try {
    const deviceId = await OTAManager.getDeviceId?.();
    await api.post(OTA_URLS.DOWNLOAD_EVENT, {
      device_id: deviceId,
      ota_version: otaVersion,
      event,
      platform: Platform.OS,
    });
  } catch (error) {
    // Best effort analytics
  }
};
