import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
{{#if VECTOR_ICONS}}
import { AppIcon, type AppIconName } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if RTL}}
{{#if VECTOR_ICONS}}
import { useDirection } from '{{IMPORT:hooks.useDirection}}';
{{/if}}
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { intlRef, type IntlFile, type IntlKey } from '{{IMPORT:i18n.index}}';
import type { Theme } from '{{IMPORT:theme.index}}';

/** `intlType` is the JSON file; `titleValue` / `rightValue` are keys inside it. */
export interface AppHeaderProps<F extends IntlFile = IntlFile> {
  intlType?: F;
  titleValue?: IntlKey<F>;
  title?: string;
  /** Shows a back button when provided. */
  onBack?: () => void;
{{#if VECTOR_ICONS}}
  /** Right action as an icon… */
  rightIcon?: AppIconName;
{{/if}}
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
{{#if VECTOR_ICONS}}
  rightIcon,
{{/if}}
  rightValue,
  onRightPress,
  rightAccessibilityLabel,
}: AppHeaderProps<F>): React.JSX.Element {
  const styles = useStyles(createStyles);
{{#if VECTOR_ICONS}}
{{#if RTL}}
  // Points "back" in reading order (i18n/direction.ts).
  const { backArrow: backIcon } = useDirection();
{{else}}
  const backIcon: AppIconName = 'arrow-left';
{{/if}}
{{/if}}

  return (
    <View style={styles.container}>
      <View style={styles.action}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={onBack}>
{{#if VECTOR_ICONS}}
            <AppIcon name={backIcon} />
{{else}}
            <AppText fontFamily="medium" color="primary" intlType="common" value="back" />
{{/if}}
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
{{#if VECTOR_ICONS}}
        {onRightPress && (rightIcon || rightValue) ? (
{{else}}
        {onRightPress && rightValue ? (
{{/if}}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightAccessibilityLabel}
            hitSlop={8}
            onPress={onRightPress}>
{{#if VECTOR_ICONS}}
            {rightIcon ? (
              <AppIcon name={rightIcon} />
            ) : (
              <AppText fontFamily="medium" color="primary" {...intlRef(intlType, rightValue)} />
            )}
{{else}}
            <AppText fontFamily="medium" color="primary" {...intlRef(intlType, rightValue)} />
{{/if}}
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
