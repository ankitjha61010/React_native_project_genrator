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

export interface PickedImage {
  /** File URI, usable in <Image source={{ uri }} /> and for uploads. */
  path: string;
  width: number;
  height: number;
  mime: string;
  size: number;
  filename?: string;
}

export interface ImagePickOptions {
  /** The image is resized to fit inside maxWidth × maxHeight. Default: 1000×1000. */
  maxWidth?: number;
  maxHeight?: number;
  /** JPEG quality between 0 and 1. Default: 0.8. */
  quality?: number;
}

export class ImagePermissionError extends Error {
  constructor(readonly permission: 'camera' | 'photoLibrary') {
    super(`${permission} permission not granted`);
    this.name = 'ImagePermissionError';
  }
}

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

function toPickedImage(asset: Asset): PickedImage {
  return {
    path: asset.uri ?? '',
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    mime: asset.type ?? 'image/jpeg',
    size: asset.fileSize ?? 0,
    filename: asset.fileName ?? undefined,
  };
}

/** Returns null when the user cancels. */
function handle(response: ImagePickerResponse, permission: 'camera' | 'photoLibrary'): PickedImage | null {
  if (response.didCancel) {
    return null;
  }
  if (response.errorCode === 'permission') {
    throw new ImagePermissionError(permission);
  }
  if (response.errorCode) {
    throw new Error(response.errorMessage ?? `Image picker failed (${response.errorCode})`);
  }
  const asset = response.assets?.[0];
  return asset?.uri ? toPickedImage(asset) : null;
}

/**
 * Image picking (react-native-image-picker), usable from any screen or hook:
 *
 *   const image = await imagePicker.pickFromGallery({ maxWidth: 600, maxHeight: 600 });
 *   if (image) upload(image.path);
 */
export const imagePicker = {
  async pickFromGallery(options?: ImagePickOptions): Promise<PickedImage | null> {
    if (!(await permissionService.ensure('photoLibrary'))) {
      throw new ImagePermissionError('photoLibrary');
    }
    return handle(await launchImageLibrary({ ...toOptions(options), selectionLimit: 1 }), 'photoLibrary');
  },

  async pickFromCamera(options?: ImagePickOptions): Promise<PickedImage | null> {
    if (!(await permissionService.ensure('camera'))) {
      throw new ImagePermissionError('camera');
    }
    return handle(await launchCamera({ ...toOptions(options), saveToPhotos: false }), 'camera');
  },
};
