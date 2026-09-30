import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppIcon, type AppIconName } from '@presentation/components/AppIcon';
import { AppText } from '@presentation/components/AppText';
import { useDirection } from '@presentation/hooks/useDirection';
import { useStyles } from '@presentation/hooks/useTheme';
import { intlRef, type IntlFile, type IntlKey } from '@infrastructure/i18n';
import type { Theme } from '@presentation/theme';

/** `intlType` is the JSON file; `titleValue` / `rightValue` are keys inside it. */
export interface AppHeaderProps<F extends IntlFile = IntlFile> {
  intlType?: F;
  titleValue?: IntlKey<F>;
  title?: string;
  /** Shows a back button when provided. */
  onBack?: () => void;
  /** Right action as an icon… */
  rightIcon?: AppIconName;
  /** …or as a translated text button. */
  rightValue?: IntlKey<F>;
  onRightPress?: () => void;
  rightAccessibilityLabel?: string;
}

export function AppHeader<F extends IntlFile>({
  intlType,
  titleValue,
  title,
  onBack,
  rightIcon,
  rightValue,
  onRightPress,
  rightAccessibilityLabel,
}: AppHeaderProps<F>): React.JSX.Element {
  const styles = useStyles(createStyles);
  // Points "back" in reading order (i18n/direction.ts).
  const { backArrow: backIcon } = useDirection();

  return (
    <View style={styles.container}>
      <View style={styles.action}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={onBack}>
            <AppIcon name={backIcon} />
          </Pressable>
        ) : null}
      </View>
      <AppText
        fontFamily="semiBold"
        fontSize="size16"
        numberOfLines={1}
        style={styles.title}
        {...intlRef(intlType, titleValue)}
        text={title}
        align="center"
      />
      <View style={styles.action}>
        {onRightPress && (rightIcon || rightValue) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightAccessibilityLabel}
            hitSlop={8}
            onPress={onRightPress}>
            {rightIcon ? (
              <AppIcon name={rightIcon} />
            ) : (
              <AppText fontFamily="medium" color="primary" {...intlRef(intlType, rightValue)} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      height: theme.spacing.spacing56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.spacing12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    title: {
      flex: theme.flexs.flexFull,
    },
    action: {
      minWidth: theme.spacing.spacing56,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
