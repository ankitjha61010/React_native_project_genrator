import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppButton } from '@presentation/components/AppButton';
import { AppScreen } from '@presentation/components/AppScreen';
import { AppText } from '@presentation/components/AppText';
import { FadeInView } from '@presentation/components/FadeInView';
import { LanguageSwitcher } from '@presentation/components/LanguageSwitcher';
import { useAuthSession } from '@presentation/hooks/useAuthSession';
import { useStyles, useTheme } from '@presentation/hooks/useTheme';
import type { RootNavigation } from '@presentation/navigation/navigationTypes';
import type { Theme } from '@presentation/theme';

/** Settings & Preferences tab: manage language, appearance/theme, and active session. */
export function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const styles = useStyles(createStyles);
  const { themeMode, toggleTheme } = useTheme();
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

      {/* Appearance & Theme */}
      <FadeInView delay={100} style={styles.section}>
        <AppText fontFamily="semiBold" fontSize="size14" color="textSecondary" text="Appearance" style={styles.sectionTitle} />
        <View style={styles.card}>
          <AppButton
            variant="secondary"
            icon="theme-light-dark"
            intlType="home"
            value="toggleTheme"
            value1={themeMode}
            onPress={toggleTheme}
          />
        </View>
      </FadeInView>

      {/* Session Management */}
      <FadeInView delay={140} style={styles.section}>
        <AppButton
          variant="danger"
          icon="logout"
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
