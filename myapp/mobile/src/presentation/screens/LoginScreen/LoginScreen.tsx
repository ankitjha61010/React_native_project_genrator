import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LoginForm } from '@presentation/components/LoginForm';
import { useLogin } from '@presentation/hooks/useLogin';
import { AppScreen } from '@presentation/components/AppScreen';
import { AppText } from '@presentation/components/AppText';
import { FadeInView } from '@presentation/components/FadeInView';
import { LegalLinks } from '@presentation/components/LegalLinks';
import { useStyles } from '@presentation/hooks/useTheme';
import type { Theme } from '@presentation/theme';

export function LoginScreen(): React.JSX.Element {
  const { control, submit, isSubmitting } = useLogin();
  const styles = useStyles(createStyles);

  return (
    <AppScreen contentStyle={styles.content}>
      <FadeInView style={styles.header}>
        <AppText fontFamily="bold" fontSize="size24" intlType="auth" value="welcomeBack" />
        <AppText color="textSecondary" intlType="auth" value="loginSubtitle" />
      </FadeInView>

      <FadeInView delay={120}>
        <LoginForm control={control} onSubmit={submit} submitting={isSubmitting} />
      </FadeInView>

      <View style={styles.footer}>
        <LegalLinks style={styles.legal} />
      </View>
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      justifyContent: 'center',
      gap: theme.spacing.spacing32,
    },
    header: {
      gap: theme.spacing.spacing4,
    },
    footer: {
      paddingTop: theme.spacing.spacing16,
    },
    legal: {
      marginTop: theme.spacing.spacing12,
    },
  });
