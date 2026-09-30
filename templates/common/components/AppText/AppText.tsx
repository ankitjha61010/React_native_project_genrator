import React from 'react';
{{#if RTL}}
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
{{else}}
import { I18nManager, Text, type TextProps, type TextStyle } from 'react-native';
{{/if}}
import { useTranslation } from 'react-i18next';
{{#if RTL}}
import { useDirection } from '{{IMPORT:hooks.useDirection}}';
{{/if}}
import { useTheme, type ColorName } from '{{IMPORT:hooks.useTheme}}';
import { translate, type IntlProps } from '{{IMPORT:i18n.index}}';
import type { Typography } from '{{IMPORT:theme.index}}';

export type FontFamily = keyof Typography['fontFamily'];
export type FontSize = keyof Typography['fontSize'];

/**
 * `intlType` – the JSON file in `i18n/locales/<language>/` ("home", "auth", "common"…).
 * `value` – the key inside that file (autocompleted from the file you chose).
 * `value1`, `value2`, `value3` – dynamic values, used in the JSON as `{{value1}}`, `{{value2}}`,
 * `{{value3}}`. `count` selects plural forms.
 *
 *   <AppText intlType="auth" value="login" />                                 -> "Login"
 *   <AppText intlType="product" value="price" value1="₹499" />                -> "Price: ₹499"
 *   <AppText intlType="home" value="imageSelected" value1={600} value2={400} /> -> "Image selected (600×400)"
 *   <AppText intlType="product" value="productCount" count={3} />             -> productCount_one / _other
 *
 * Weight comes from the font family (GolosText-Medium, -Bold…), never from `fontWeight`:
 *
 *   <AppText fontFamily="bold" fontSize="size24" color="primary" intlType="home" value="home" />
 */
/**
 * RTL: React Native treats `textAlign: 'left'` as "start" and flips it to the right in RTL
 * layouts, but leaves the default `'auto'` untouched – so without this, Arabic text stays
 * left-aligned. `writingDirection` keeps mixed text ("السمة: light") in the right order (iOS).
{{#if RTL}}
 * Picked per render from useDirection(), so text follows a language switch at once.
 */
const TEXT_DIRECTION = StyleSheet.create({
  ltr: { textAlign: 'left', writingDirection: 'ltr' },
  rtl: { textAlign: 'left', writingDirection: 'rtl' },
});
{{else}}
 */
const TEXT_DIRECTION: TextStyle = {
  textAlign: 'left',
  writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
};
{{/if}}

interface AppTextOwnProps {
  /**
   * Plain, non-translated text. Prefer `intlType` + `value` for anything user facing.
   * Can be combined with `children` – text is rendered first, then children.
   */
  text?: string;
  /** `theme.typography.fontFamily` key. Default: regular. */
  fontFamily?: FontFamily;
  /** `theme.typography.fontSize` key. Default: size14. */
  fontSize?: FontSize;
  /** `theme.colors` key. Default: text (follows light / dark mode). */
  color?: ColorName;
  /** Default: start – `'left'` in LTR, mirrored to the right in RTL. Use `'center'` / `'justify'` as needed. */
  align?: TextStyle['textAlign'];
  /**
   * Supports plain strings, JSX, and nested `<AppText>` components.
   *
   * @example
   * // Nested AppText – works because React Native Text supports nesting:
   * <AppText fontFamily="bold">
   *   Hello{' '}
   *   <AppText color="primary">world</AppText>
   * </AppText>
   */
  children?: React.ReactNode;
}

export type AppTextProps = TextProps & IntlProps & AppTextOwnProps;

/**
 * The only component that renders text. All translations are resolved here, so the
 * whole UI re-renders in the new language as soon as `changeLanguage()` is called.
 */
export function AppText({
  intlType,
  value,
  value1,
  value2,
  value3,
  count,
  text,
  fontFamily = 'regular',
  fontSize = 'size14',
  color = 'text',
  align,
  style,
  children,
  ...rest
}: AppTextProps): React.JSX.Element {
  // Subscribes to language changes.
  useTranslation();
  const { theme } = useTheme();
{{#if RTL}}
  const { direction } = useDirection();
{{/if}}

  // Resolve translated content if intl props are supplied.
  const intlContent = intlType && value
    ? translate(intlType, value, { value1, value2, value3, count })
    : null;

  /**
   * Content resolution:
   * 1. If intl props supplied  → intlContent (+ children appended if present).
   * 2. Else if `text` prop     → `text` string (+ children appended if present).
   * 3. Else                   → children only (supports nested <AppText>).
   *
   * React Native's <Text> natively supports nested <Text> children, so nested
   * <AppText> works out of the box – the inner AppText renders its own <Text>
   * and inherits parent font styles automatically.
   */
  const resolvedContent: React.ReactNode = (() => {
    if (intlContent !== null) {
      return children ? <>{intlContent}{children}</> : intlContent;
    }
    if (text !== undefined) {
      return children ? <>{text}{children}</> : text;
    }
    return children;
  })();

  return (
    <Text
      allowFontScaling={false}
      style={[
        {{#if RTL}}TEXT_DIRECTION[direction]{{else}}TEXT_DIRECTION{{/if}},
        {
          fontFamily: theme.typography.fontFamily[fontFamily],
          fontSize: theme.typography.fontSize[fontSize],
          color: theme.colors[color],
          ...(align ? { textAlign: align } : null),
        },
        style,
      ]}
      {...rest}>
      {resolvedContent}
    </Text>
  );
}
