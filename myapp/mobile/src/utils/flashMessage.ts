import { hideMessage, showMessage } from 'react-native-flash-message';
import { translate, type IntlRef, type IntlValues } from '@infrastructure/i18n';

type FlashType = 'success' | 'error' | 'info' | 'warning';

/**
 * A translation (`intlType` = JSON file, `value` = key) or a plain `message`:
 *
 *   flash.success({ intlType: 'home', value: 'notificationsEnabled' })
 *   flash.error({ message: error.message })
 */
type FlashContent = (IntlRef & IntlValues & { message?: never }) | { message: string; intlType?: never; value?: never };

export type FlashOptions = FlashContent & {
  description?: string;
  duration?: number;
  onPress?: () => void;
};

const TYPE_MAP = { success: 'success', error: 'danger', info: 'info', warning: 'warning' } as const;

/** Shows an in-app banner. `<FlashMessage />` is mounted once in AppProviders. */
export function showFlash(type: FlashType, options: FlashOptions): void {
  const message = options.intlType
    ? translate(options.intlType, options.value, {
        value1: options.value1,
        value2: options.value2,
        value3: options.value3,
        count: options.count,
      })
    : options.message;
  showMessage({
    type: TYPE_MAP[type],
    message: message ?? '',
    description: options.description,
    duration: options.duration ?? 3000,
    onPress: options.onPress,
    icon: 'auto',
  });
}

export const flash = {
  success: (options: FlashOptions) => showFlash('success', options),
  error: (options: FlashOptions) => showFlash('error', options),
  info: (options: FlashOptions) => showFlash('info', options),
  warning: (options: FlashOptions) => showFlash('warning', options),
  hide: hideMessage,
};
