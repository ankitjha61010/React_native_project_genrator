import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppIcon, type AppIconName } from '@presentation/components/AppIcon';
import { AppText } from '@presentation/components/AppText';
import { useStyles, useTheme, type ColorName } from '@presentation/hooks/useTheme';
import { intlRef, type IntlProps } from '@infrastructure/i18n';
import type { Theme } from '@presentation/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
/** `small`: compact buttons in headers / toolbars (35 pt high, plus hitSlop for an easy tap). */
type Size = 'medium' | 'small';

interface AppButtonOwnProps {
  /** Plain label when no translation is needed. */
  title?: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: AppIconName;
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
  size = 'medium',
  icon,
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
      hitSlop={size === 'small' ? 6 : undefined}
      style={({ pressed }) => [
        styles.base,
        size === 'small' && styles.small,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: colorOf(pressed ? scheme.pressed : scheme.background),
          borderColor: colorOf(scheme.border),
        },
        inactive && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors[scheme.text]} />
      ) : (
        <View style={styles.content}>
          {icon ? <AppIcon name={icon} size="sm" color={scheme.text} /> : null}
          <AppText
            fontFamily="semiBold"
            fontSize={size === 'small' ? 'size14' : 'size16'}
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
    small: {
      minHeight: theme.spacing.spacing35,
      paddingHorizontal: theme.spacing.spacing16,
      borderRadius: theme.borderRadius.radius20,
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
