import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { AppScreen } from '{{IMPORT:components.AppScreen}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { FadeInView } from '{{IMPORT:components.FadeInView}}';
import { LanguageSwitcher } from '{{IMPORT:components.LanguageSwitcher}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
{{#if THEME_CONTEXT}}
import { useStyles, useTheme } from '{{IMPORT:hooks.useTheme}}';
{{else}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
{{/if}}
import type { RootNavigation } from '{{IMPORT:navigation.types}}';
import type { Theme } from '{{IMPORT:theme.index}}';

/** Second tab: language, theme and logout. */
export function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const styles = useStyles(createStyles);
{{#if THEME_CONTEXT}}
  const { themeMode, toggleTheme } = useTheme();
{{/if}}
  const { signOut } = useAuthSession();

  const logout = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  return (
    <AppScreen edges={[]}>
      <FadeInView style={styles.card}>
        <AppText fontFamily="semiBold" fontSize="size16" intlType="home" value="switchLanguage" />
        <LanguageSwitcher />
      </FadeInView>

{{#if THEME_CONTEXT}}
      <FadeInView delay={80} style={styles.card}>
        <AppButton
          variant="secondary"
{{#if VECTOR_ICONS}}
          icon="theme-light-dark"
{{/if}}
          intlType="home"
          value="toggleTheme"
          value1={themeMode}
          onPress={toggleTheme}
        />
      </FadeInView>

{{/if}}
      <FadeInView delay={160}>
        <AppButton
          variant="danger"
{{#if VECTOR_ICONS}}
          icon="logout"
{{/if}}
          intlType="common"
          value="logout"
          onPress={logout}
        />
      </FadeInView>
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      gap: theme.spacing.spacing12,
      padding: theme.spacing.spacing16,
      marginBottom: theme.spacing.spacing16,
      borderRadius: theme.borderRadius.radius12,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.activityCardShadow,
    },
  });
