import React, { useState } from 'react';
import { I18nManager, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
{{#if VECTOR_ICONS}}
import { AppIcon, type AppIconName } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { AppText } from '{{IMPORT:components.AppText}}';
import { useStyles, useTheme } from '{{IMPORT:hooks.useTheme}}';
import { intlRef, translate, type IntlFile, type IntlKey } from '{{IMPORT:i18n.index}}';
import type { Theme } from '{{IMPORT:theme.index}}';

/**
 * `intlType` is the JSON file; `labelValue`, `placeholderValue` and `errorValue` are keys inside it:
 *
 *   <AppInput intlType="auth" labelValue="email" placeholderValue="emailPlaceholder" />
 */
export interface AppInputProps<F extends IntlFile = IntlFile> extends Omit<TextInputProps, 'placeholder'> {
  intlType?: F;
  labelValue?: IntlKey<F>;
  label?: string;
  placeholderValue?: IntlKey<F>;
  placeholder?: string;
  /** Validation error as a translation key (our zod schemas use keys as messages). */
  errorValue?: IntlKey<F>;
  error?: string;
{{#if VECTOR_ICONS}}
  leftIcon?: AppIconName;
{{/if}}
  ref?: React.ComponentProps<typeof TextInput>['ref'];
}

export function AppInput<F extends IntlFile>({
  intlType,
  labelValue,
  label,
  placeholderValue,
  placeholder,
  errorValue,
  error,
{{#if VECTOR_ICONS}}
  leftIcon,
{{/if}}
  secureTextEntry,
  style,
  onFocus,
  onBlur,
  ref,
  ...rest
}: AppInputProps<F>): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const hasLabel = Boolean(labelValue || label);
  const hasError = Boolean(errorValue || error);

  return (
    <View style={styles.container}>
      {hasLabel ? (
        <AppText fontFamily="medium" color="textSecondary" {...intlRef(intlType, labelValue)} text={label} />
      ) : null}
      <View style={[styles.field, focused && styles.fieldFocused, hasError && styles.fieldError]}>
{{#if VECTOR_ICONS}}
        {leftIcon ? <AppIcon name={leftIcon} size="sm" color="textSecondary" /> : null}
{{/if}}
        <TextInput
          ref={ref}
          placeholder={intlType && placeholderValue ? translate(intlType, placeholderValue) : placeholder}
          placeholderTextColor={theme.colors.placeholder}
          secureTextEntry={hidden}
          allowFontScaling={false}
          style={[styles.input, style]}
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable accessibilityRole="button" hitSlop={theme.spacing.spacing8} onPress={() => setHidden(value => !value)}>
{{#if VECTOR_ICONS}}
            <AppIcon name={hidden ? 'eye-outline' : 'eye-off-outline'} size="sm" color="textSecondary" />
{{else}}
            <AppText
              fontFamily="medium"
              fontSize="size12"
              color="primary"
              intlType="common"
              value={hidden ? 'show' : 'hide'}
            />
{{/if}}
          </Pressable>
        ) : null}
      </View>
      {hasError ? (
        <AppText fontSize="size12" color="error" {...intlRef(intlType, errorValue)} text={error} />
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.spacing4,
    },
    field: {
      minHeight: theme.spacing.spacing48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing8,
      paddingHorizontal: theme.spacing.spacing12,
      borderRadius: theme.borderRadius.radius8,
      borderWidth: theme.spacing.spacing1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.inputShadow,
    },
    fieldFocused: {
      borderColor: theme.colors.primary,
    },
    fieldError: {
      borderColor: theme.colors.error,
    },
    input: {
      flex: theme.flexs.flexFull,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.size14,
      color: theme.colors.text,
      paddingVertical: theme.spacing.spacing8,
      // RTL: no textAlign on purpose. TextInput doesn't mirror 'left' (Android) and mixes both
      // meanings while typing (iOS), so the cursor jumps. 'auto' + the writing direction keeps
      // text at the start – on the right in RTL – on both platforms.
      writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    },
  });
