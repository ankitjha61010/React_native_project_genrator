import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type CameraOptions,
  type ImageLibraryOptions,
  type ImagePickerResponse,
  type PhotoQuality,
} from 'react-native-image-picker';
import { permissionService } from '{{IMPORT:permissions.service}}';

export interface PickedMedia {
  /** File URI, usable in <Image source={{ uri }} /> and for uploads. */
  path: string;
  width?: number;
  height?: number;
  mime: string;
  size?: number;
  filename?: string;
  duration?: number;
  type: 'image' | 'video';
}

export type PickedImage = PickedMedia;

export interface ImagePickOptions {
  /** The image is resized to fit inside maxWidth × maxHeight. Default: 1000×1000. */
  maxWidth?: number;
  maxHeight?: number;
  /** JPEG quality between 0 and 1. Default: 0.8. */
  quality?: number;
}

export interface VideoPickOptions {
  /** Maximum recording limit in seconds. Default: 60. */
  durationLimit?: number;
  /** Video quality ('low' | 'medium' | 'high'). Default: 'high'. */
  videoQuality?: 'low' | 'medium' | 'high';
}

export class MediaPermissionError extends Error {
  constructor(readonly permission: 'camera' | 'photoLibrary') {
    super(`${permission} permission not granted`);
    this.name = 'MediaPermissionError';
  }
}

export const ImagePermissionError = MediaPermissionError;

function toQuality(quality = 0.8): PhotoQuality {
  return (Math.round(Math.min(Math.max(quality, 0), 1) * 10) / 10) as PhotoQuality;
}

function toOptions(options: ImagePickOptions = {}): ImageLibraryOptions & CameraOptions {
  return {
    mediaType: 'photo',
    maxWidth: options.maxWidth ?? 1000,
    maxHeight: options.maxHeight ?? 1000,
    quality: toQuality(options.quality),
  };
}

function toPickedMedia(asset: Asset, defaultType: 'image' | 'video'): PickedMedia {
  const isVideo = defaultType === 'video' || (asset.type?.startsWith('video') ?? false);
  return {
    path: asset.uri ?? '',
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    mime: asset.type ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
    size: asset.fileSize ?? 0,
    filename: asset.fileName ?? undefined,
    duration: asset.duration ? Math.round(asset.duration) : undefined,
    type: isVideo ? 'video' : 'image',
  };
}

/** Returns null when the user cancels. */
function handle(
  response: ImagePickerResponse,
  permission: 'camera' | 'photoLibrary',
  mediaType: 'image' | 'video' = 'image'
): PickedMedia | null {
  if (response.didCancel) {
    return null;
  }
  if (response.errorCode === 'permission') {
    throw new MediaPermissionError(permission);
  }
  if (response.errorCode) {
    throw new Error(response.errorMessage ?? `Media picker failed (${response.errorCode})`);
  }
  const asset = response.assets?.[0];
  return asset?.uri ? toPickedMedia(asset, mediaType) : null;
}

/**
 * Media picking (react-native-image-picker) for Photos & Videos:
 */
export const mediaPickerService = {
  async pickImageFromGallery(options?: ImagePickOptions): Promise<PickedMedia | null> {
    if (!(await permissionService.ensure('photoLibrary'))) {
      throw new MediaPermissionError('photoLibrary');
    }
    return handle(
      await launchImageLibrary({ ...toOptions(options), mediaType: 'photo', selectionLimit: 1 }),
      'photoLibrary',
      'image'
    );
  },

  async captureImageFromCamera(options?: ImagePickOptions): Promise<PickedMedia | null> {
    if (!(await permissionService.ensure('camera'))) {
      throw new MediaPermissionError('camera');
    }
    return handle(
      await launchCamera({ ...toOptions(options), mediaType: 'photo', saveToPhotos: false }),
      'camera',
      'image'
    );
  },

  async pickVideoFromGallery(options?: VideoPickOptions): Promise<PickedMedia | null> {
    if (!(await permissionService.ensure('photoLibrary'))) {
      throw new MediaPermissionError('photoLibrary');
    }
    return handle(
      await launchImageLibrary({ mediaType: 'video', selectionLimit: 1, videoQuality: options?.videoQuality ?? 'high' }),
      'photoLibrary',
      'video'
    );
  },

  async captureVideoFromCamera(options?: VideoPickOptions): Promise<PickedMedia | null> {
    if (!(await permissionService.ensure('camera'))) {
      throw new MediaPermissionError('camera');
    }
    return handle(
      await launchCamera({
        mediaType: 'video',
        durationLimit: options?.durationLimit ?? 60,
        videoQuality: options?.videoQuality ?? 'high',
        saveToPhotos: false,
      }),
      'camera',
      'video'
    );
  },
};

export const imagePicker = {
  pickFromGallery: mediaPickerService.pickImageFromGallery,
  pickFromCamera: mediaPickerService.captureImageFromCamera,
};
