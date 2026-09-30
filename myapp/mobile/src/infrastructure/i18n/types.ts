import type { Namespace, TranslationResources } from './resources';

type PluralSuffix = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/** "productCount_one" / "productCount_other" are both addressed as "productCount" (i18next plurals). */
type StripPlural<K extends string> = K extends `${infer Base}_${PluralSuffix}` ? Base : K;

/** A JSON file in `locales/<language>/`: "common", "auth", "home"… */
export type IntlFile = Namespace;

/** A key inside one file, e.g. `IntlKey<'home'>` = "pickImage" | "imageSelected" | … */
export type IntlKey<F extends IntlFile = IntlFile> = F extends IntlFile
  ? StripPlural<keyof TranslationResources[F] & string>
  : never;

/**
 * File + key: `intlType` is the JSON file, `value` a key inside it. Once `intlType` is set,
 * `value` only autocompletes (and accepts) the keys of that file.
 */
export type IntlRef = { [F in IntlFile]: { intlType: F; value: IntlKey<F> } }[IntlFile];

export type IntlValue = string | number;

/**
 * Up to three dynamic values, written in the JSON as `{{value1}}`, `{{value2}}`, `{{value3}}`:
 *
 *   home.json › "imageSelected": "Image selected ({{value1}}×{{value2}})"
 *   <AppText intlType="home" value="imageSelected" value1={600} value2={400} />
 *
 * `count` selects the plural form (`productCount_one` / `productCount_other`) and fills `{{count}}`.
 */
export interface IntlValues {
  value1?: IntlValue;
  value2?: IntlValue;
  value3?: IntlValue;
  count?: number;
}

/** Props of every component that renders a translation. Leave both out to render plain text. */
export type IntlProps = (IntlRef | { intlType?: undefined; value?: undefined }) & IntlValues;
