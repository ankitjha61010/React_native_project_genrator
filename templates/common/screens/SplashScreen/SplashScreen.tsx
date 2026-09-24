import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppLoader } from '{{IMPORT:components.AppLoader}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { FadeInView } from '{{IMPORT:components.FadeInView}}';
import { appConfig } from '{{IMPORT:config.app}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { RootNavigation } from '{{IMPORT:navigation.types}}';
import type { Theme } from '{{IMPORT:theme.index}}';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(() => resolve(), ms));

export function SplashScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const { restore } = useAuthSession();
  const styles = useStyles(createStyles);

  useEffect(() => {
    let active = true;
    // DEMO: simulated initialisation. Load remote config, fonts, feature flags… here.
    Promise.all([restore(), wait(appConfig.splashDelayMs)]).then(([signedIn]) => {
      if (active) {
        navigation.reset({ index: 0, routes: [{ name: signedIn ? 'Main' : 'Auth' }] });
      }
    });
    return () => {
      active = false;
    };
  }, [navigation, restore]);

  return (
    <View style={styles.container}>
      <FadeInView style={styles.content}>
        <AppText fontFamily="bold" fontSize="size32" color="onPrimary" intlType="common" value="appName" align="center" />
        <AppText color="onPrimary" intlType="auth" value="initializing" align="center" />
      </FadeInView>
      <AppLoader color="onPrimary" />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: theme.flexs.flexFull,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.spacing24,
      backgroundColor: theme.colors.primary,
    },
    content: {
      gap: theme.spacing.spacing8,
      paddingHorizontal: theme.spacing.spacing24,
    },
  });
