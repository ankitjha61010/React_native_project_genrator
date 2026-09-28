import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LoginForm } from '{{IMPORT:auth.form}}';
import { {{SYMBOL:auth.logic}} } from '{{IMPORT:auth.logic}}';
import { AppScreen } from '{{IMPORT:components.AppScreen}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { FadeInView } from '{{IMPORT:components.FadeInView}}';
import { LegalLinks } from '{{IMPORT:components.LegalLinks}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';

export function LoginScreen(): React.JSX.Element {
  const { control, submit, isSubmitting } = {{SYMBOL:auth.logic}}();
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
        {/* DEMO behaviour – remove once a real login endpoint is connected. */}
        <AppText fontSize="size12" color="textSecondary" intlType="auth" value="loginDemoNotice" align="center" />
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
