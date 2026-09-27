import React from 'react';
import { StyleSheet, View } from 'react-native';
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

/** Settings & Preferences tab: manage language, appearance/theme, and active session. */
export function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const styles = useStyles(createStyles);
{{#if THEME_CONTEXT}}
  const { themeMode, toggleTheme } = useTheme();
{{/if}}
  const { user, signOut } = useAuthSession();

  const logout = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  return (
    <AppScreen edges={[]}>
      {/* User Account Info Card */}
      <FadeInView style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <AppText fontFamily="bold" fontSize="size20" color="onPrimary" text={(user?.name ?? 'U').charAt(0).toUpperCase()} />
        </View>
        <View style={styles.profileInfo}>
          <AppText fontFamily="bold" fontSize="size16" text={user?.name ?? 'User Account'} />
          <AppText fontSize="size13" color="textSecondary" text={user?.email ?? 'user@example.com'} />
        </View>
      </FadeInView>

      {/* Language Preferences */}
      <FadeInView delay={60} style={styles.section}>
        <AppText fontFamily="semiBold" fontSize="size14" color="textSecondary" intlType="home" value="switchLanguage" style={styles.sectionTitle} />
        <View style={styles.card}>
          <LanguageSwitcher />
        </View>
      </FadeInView>

{{#if THEME_CONTEXT}}
      {/* Appearance & Theme */}
      <FadeInView delay={100} style={styles.section}>
        <AppText fontFamily="semiBold" fontSize="size14" color="textSecondary" text="Appearance" style={styles.sectionTitle} />
        <View style={styles.card}>
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
        </View>
      </FadeInView>

{{/if}}
      {/* Session Management */}
      <FadeInView delay={140} style={styles.section}>
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
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing16,
      padding: theme.spacing.spacing16,
      borderRadius: theme.borderRadius.radius14,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.spacing20,
      ...theme.shadows.profileCardShadow,
    },
    avatarCircle: {
      width: theme.spacing.spacing48,
      height: theme.spacing.spacing48,
      borderRadius: theme.borderRadius.radius1000,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileInfo: {
      flex: theme.flexs.flexFull,
      gap: theme.spacing.spacing2,
    },
    section: {
      marginBottom: theme.spacing.spacing20,
    },
    sectionTitle: {
      marginBottom: theme.spacing.spacing8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    card: {
      padding: theme.spacing.spacing16,
      borderRadius: theme.borderRadius.radius14,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      ...theme.shadows.activityCardShadow,
    },
  });
