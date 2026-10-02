import { useCallback, useEffect, useRef, useState } from 'react';
import type { DownloadProgress, OTAStatus, OTAUpdateInfo } from '../types/ota.types';
import {
  applyBundle,
  checkForUpdate,
  downloadBundle,
  errorMessageFor,
  reportDownloadEvent,
  restartApp,
  verifyBundle,
} from '../services/OTAService';

export interface UseOTAReturn {
  status: OTAStatus;
  updateInfo: OTAUpdateInfo | null;
  progress: DownloadProgress;
  errorMessage: string | null;
  isMandatory: boolean;
  check: () => Promise<void>;
  downloadAndInstall: (allowCellular?: boolean) => Promise<void>;
  restart: () => void;
  dismiss: () => void;
}

export function useOTA(autoCheck = true): UseOTAReturn {
  const [status, setStatus] = useState<OTAStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<OTAUpdateInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress>({ progress: 0, bytesWritten: 0, contentLength: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const jobIdRef = useRef<number | null>(null);

  const check = useCallback(async () => {
    try {
      setStatus('checking');
      setErrorMessage(null);
      const info = await checkForUpdate();
      if (info && info.update_available) {
        setUpdateInfo(info);
        setStatus('available');
      } else {
        setStatus('up_to_date');
      }
    } catch (error: any) {
      setErrorMessage(errorMessageFor(error));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (autoCheck) {
      check();
    }
  }, [autoCheck, check]);

  const downloadAndInstall = useCallback(
    async (allowCellular = false) => {
      if (!updateInfo) return;
      try {
        setStatus('downloading');
        setProgress({ progress: 0, bytesWritten: 0, contentLength: updateInfo.bundle_size || 0 });
        await reportDownloadEvent(updateInfo.ota_version, 'download_started');

        const filePath = await downloadBundle(updateInfo, {
          allowCellular,
          jobIdRef,
          onProgress: p => setProgress(p),
        });

        setStatus('verifying');
        await verifyBundle(filePath, updateInfo);

        setStatus('applying');
        await applyBundle(filePath, updateInfo);

        await reportDownloadEvent(updateInfo.ota_version, 'apply_success');
        setStatus('ready');
      } catch (error: any) {
        const msg = errorMessageFor(error);
        setErrorMessage(msg);
        setStatus('error');
        await reportDownloadEvent(updateInfo?.ota_version, 'failed');
      }
    },
    [updateInfo],
  );

  const restart = useCallback(() => {
    restartApp();
  }, []);

  const dismiss = useCallback(() => {
    if (status !== 'downloading' && status !== 'applying') {
      setStatus('idle');
    }
  }, [status]);

  const isMandatory = Boolean(updateInfo?.force_update);

  return {
    status,
    updateInfo,
    progress,
    errorMessage,
    isMandatory,
    check,
    downloadAndInstall,
    restart,
    dismiss,
  };
}
