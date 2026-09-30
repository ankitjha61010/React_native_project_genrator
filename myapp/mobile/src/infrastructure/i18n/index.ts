import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { languageDetector } from './languageDetector';
import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES } from './languages';
import { DEFAULT_NAMESPACE, NAMESPACES, resources } from './resources';
import type { IntlFile, IntlKey, IntlProps, IntlValues } from './types';

let initialization: Promise<unknown> | undefined;

/** Initialises i18next once. `AppProviders` waits for it before rendering. */
export function initI18n(): Promise<unknown> {
  initialization ??= i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
      resources,
      ns: NAMESPACES,
      defaultNS: DEFAULT_NAMESPACE,
      // Keys are flat ("pickImage") – never split them on "." or ":".
      keySeparator: false,
      nsSeparator: false,
      fallbackLng: FALLBACK_LANGUAGE,
      supportedLngs: SUPPORTED_LANGUAGES,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
  return initialization;
}

/**
 * Translate outside of JSX – e.g. `placeholder`, `Alert.alert` or navigation titles.
 * For visible text use `<AppText intlType="home" value="pickImage" />`, which also re-renders
 * on language change.
 *
 *   translate('home', 'imageSelected', { value1: 600, value2: 400 })
 */
export function translate<F extends IntlFile>(file: F, key: IntlKey<F>, values: IntlValues = {}): string {
  // Only pass the values that are set, so `{{value2}}` never renders "undefined".
  const options = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
  return i18n.t(key, { ...options, ns: file }) as string;
}

/**
 * Builds AppText props from a file + key that may be missing (e.g. optional component props):
 *
 *   <AppText {...intlRef(intlType, labelValue)} text={label} />
 */
export function intlRef<F extends IntlFile>(file: F | undefined, key: IntlKey<F> | undefined): IntlProps {
  return file && key ? ({ intlType: file, value: key } as IntlProps) : {};
}

export { i18n };
export * from './languages';
export type { Namespace } from './resources';
export type { IntlFile, IntlKey, IntlProps, IntlRef, IntlValue, IntlValues } from './types';
export * from './direction';
