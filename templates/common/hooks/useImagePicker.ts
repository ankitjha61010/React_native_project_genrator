import { useCallback, useState } from 'react';
import { imagePicker, ImagePermissionError, type ImagePickOptions, type PickedImage } from '{{IMPORT:media.imagePicker}}';
import { permissionService } from '{{IMPORT:permissions.service}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { logger } from '{{IMPORT:utils.logger}}';

/**
 * React wrapper around `imagePicker` with loading state and user feedback.
 *
 *   const { image, pickFromGallery } = useImagePicker();
 *   <AppButton onPress={() => pickFromGallery({ maxWidth: 600, maxHeight: 600 })} />
 */
export function useImagePicker() {
  const [image, setImage] = useState<PickedImage | null>(null);
  const [picking, setPicking] = useState(false);

  const pick = useCallback(async (source: 'gallery' | 'camera', options?: ImagePickOptions) => {
    setPicking(true);
    try {
      const result =
        source === 'camera' ? await imagePicker.pickFromCamera(options) : await imagePicker.pickFromGallery(options);
      if (result) {
        setImage(result);
      }
      return result;
    } catch (error) {
      if (error instanceof ImagePermissionError) {
        flash.warning({
          intlType: 'common', value: 'permissionDenied',
          onPress: () => {
            permissionService.openSettings();
          },
        });
      } else {
        logger.error('Image picker failed', error);
        flash.error({ intlType: 'common', value: 'genericError' });
      }
      return null;
    } finally {
      setPicking(false);
    }
  }, []);

  return {
    image,
    picking,
    pickFromGallery: (options?: ImagePickOptions) => pick('gallery', options),
    pickFromCamera: (options?: ImagePickOptions) => pick('camera', options),
    clear: () => setImage(null),
  };
}
