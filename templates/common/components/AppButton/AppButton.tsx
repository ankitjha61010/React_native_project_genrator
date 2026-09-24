import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
{{#if VECTOR_ICONS}}
import { AppIcon, type AppIconName } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { AppText } from '{{IMPORT:components.AppText}}';
import { useStyles, useTheme, type ColorName } from '{{IMPORT:hooks.useTheme}}';
import { intlRef, type IntlProps } from '{{IMPORT:i18n.index}}';
import type { Theme } from '{{IMPORT:theme.index}}';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface AppButtonOwnProps {
  /** Plain label when no translation is needed. */
  title?: string;
  onPress?: () => void;
  variant?: Variant;
{{#if VECTOR_ICONS}}
  icon?: AppIconName;
{{/if}}
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * `intlType` is the JSON file, `value` the key inside it, `value1`…`value3` fill `{{value1}}`…`{{value3}}`:
 *
 *   <AppButton intlType="auth" value="login" onPress={submit} />
 */
export type AppButtonProps = IntlProps & AppButtonOwnProps;

const VARIANTS: Record<Variant, { background?: ColorName; pressed?: ColorName; text: ColorName; border?: ColorName }> = {
  primary: { background: 'primary', pressed: 'primaryPressed', text: 'onPrimary' },
  secondary: { background: 'primarySoft', pressed: 'primarySoftPressed', text: 'primary' },
  outline: { pressed: 'pressed', text: 'primary', border: 'primary' },
  ghost: { pressed: 'pressed', text: 'primary' },
  danger: { background: 'error', pressed: 'errorPressed', text: 'onPrimary' },
};

export function AppButton({
  intlType,
  value,
  value1,
  value2,
  value3,
  count,
  title,
  onPress,
  variant = 'primary',
{{#if VECTOR_ICONS}}
  icon,
{{/if}}
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  testID,
}: AppButtonProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const scheme = VARIANTS[variant];
  const inactive = disabled || loading;
  const colorOf = (name?: ColorName) => (name ? theme.colors[name] : 'transparent');

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: colorOf(pressed ? scheme.pressed : scheme.background),
          borderColor: colorOf(scheme.border),
        },
        inactive && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.colors[scheme.text]} />
      ) : (
        <View style={styles.content}>
{{#if VECTOR_ICONS}}
          {icon ? <AppIcon name={icon} size="sm" color={scheme.text} /> : null}
{{/if}}
          <AppText
            fontFamily="semiBold"
            fontSize="size16"
            color={scheme.text}
            {...intlRef(intlType, value)}
            value1={value1}
            value2={value2}
            value3={value3}
            count={count}
            text={title}
          />
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: theme.spacing.spacing48,
      paddingHorizontal: theme.spacing.spacing24,
      borderRadius: theme.borderRadius.radius8,
      borderWidth: theme.spacing.spacing1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullWidth: {
      alignSelf: 'stretch',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing8,
    },
    disabled: {
      opacity: theme.opacity.opacity4 + theme.opacity.opacity2,
    },
  });
