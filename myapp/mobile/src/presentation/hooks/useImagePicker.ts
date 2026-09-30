import { useCallback, useState } from 'react';
import {
  mediaPickerService,
  MediaPermissionError,
  type ImagePickOptions,
  type VideoPickOptions,
  type PickedMedia,
} from '@infrastructure/media/imagePicker';
import { permissionService } from '@infrastructure/permissions/permissionService';
import { flash } from '@utils/flashMessage';
import { logger } from '@utils/logger';

export type MediaAction = 'gallery_photo' | 'camera_photo' | 'gallery_video' | 'camera_video';

/**
 * React hook wrapper around `mediaPickerService` with permission error handling and state.
 */
export function useImagePicker() {
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [picking, setPicking] = useState(false);

  const pick = useCallback(
    async (
      action: MediaAction,
      options?: ImagePickOptions & VideoPickOptions
    ): Promise<PickedMedia | null> => {
      setPicking(true);
      try {
        let result: PickedMedia | null = null;
        switch (action) {
          case 'camera_photo':
            result = await mediaPickerService.captureImageFromCamera(options);
            break;
          case 'gallery_photo':
            result = await mediaPickerService.pickImageFromGallery(options);
            break;
          case 'camera_video':
            result = await mediaPickerService.captureVideoFromCamera(options);
            break;
          case 'gallery_video':
            result = await mediaPickerService.pickVideoFromGallery(options);
            break;
        }

        if (result) {
          setMedia(result);
        }
        return result;
      } catch (error) {
        if (error instanceof MediaPermissionError) {
          flash.warning({
            intlType: 'common',
            value: 'permissionDenied',
            onPress: () => {
              permissionService.openSettings();
            },
          });
        } else {
          logger.error('Media picker failed', error);
          flash.error({ intlType: 'common', value: 'genericError' });
        }
        return null;
      } finally {
        setPicking(false);
      }
    },
    []
  );

  return {
    image: media,
    media,
    picking,
    pickFromGallery: (options?: ImagePickOptions) => pick('gallery_photo', options),
    pickFromCamera: (options?: ImagePickOptions) => pick('camera_photo', options),
    pickVideoFromGallery: (options?: VideoPickOptions) => pick('gallery_video', options),
    recordVideoFromCamera: (options?: VideoPickOptions) => pick('camera_video', options),
    pick,
    clear: () => setMedia(null),
  };
}
