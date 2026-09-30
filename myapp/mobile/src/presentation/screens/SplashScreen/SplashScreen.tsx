import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppLoader } from '@presentation/components/AppLoader';
import { AppText } from '@presentation/components/AppText';
import { FadeInView } from '@presentation/components/FadeInView';
import { appConfig } from '@infrastructure/config/appConfig';
import { useAuthSession } from '@presentation/hooks/useAuthSession';
import { useStyles } from '@presentation/hooks/useTheme';
import type { RootNavigation } from '@presentation/navigation/navigationTypes';
import type { Theme } from '@presentation/theme';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(() => resolve(), ms));

export function SplashScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const { restore } = useAuthSession();
  const styles = useStyles(createStyles);

  useEffect(() => {
    let active = true;
    // DEMO: simulated initialisation. Load remote config, fonts, feature flags… here.
    Promise.all([
      restore().catch(() => false),
      wait(appConfig.splashDelayMs),
    ])
      .then(([signedIn]) => {
        if (active) {
          navigation.reset({ index: 0, routes: [{ name: signedIn ? 'Main' : 'Auth' }] });
        }
      })
      .catch(() => {
        if (active) {
          navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
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
