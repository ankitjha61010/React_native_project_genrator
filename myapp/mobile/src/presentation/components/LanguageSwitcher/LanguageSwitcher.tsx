import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@presentation/components/AppText';
import { useLanguage } from '@presentation/hooks/useLanguage';
import { useStyles } from '@presentation/hooks/useTheme';
import type { Theme } from '@presentation/theme';

/** Segmented control listing every language from `i18n/languages.ts`. */
export function LanguageSwitcher(): React.JSX.Element {
  const { language, languages, changeLanguage } = useLanguage();
  const styles = useStyles(createStyles);

  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {languages.map(item => {
        const selected = item.code === language;
        return (
          <Pressable
            key={item.code}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => changeLanguage(item.code)}
            style={[styles.option, selected && styles.optionSelected]}>
            <AppText fontFamily="medium" color={selected ? 'onPrimary' : 'text'} text={item.nativeLabel} />
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.spacing8,
    },
    option: {
      paddingVertical: theme.spacing.spacing8,
      paddingHorizontal: theme.spacing.spacing16,
      borderRadius: theme.borderRadius.radius1000,
      borderWidth: theme.spacing.spacing1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    optionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
  });
