import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { Provider as ReduxProvider } from 'react-redux';
import { useDirection } from '@presentation/hooks/useDirection';
import { applyLayoutDirection, i18n, initI18n } from '@infrastructure/i18n';
import { store } from '@business/state';
import { logger } from '@utils/logger';
import { ThemeProvider } from './ThemeContext';

// Light / dark / system theme – read it anywhere with useTheme().
const ThemeRoot = ThemeProvider;

function StateProvider({ children }: { children: React.ReactNode }) {
  return <ReduxProvider store={store}>{children}</ReduxProvider>;
}

/** Every app-wide provider, in one place. */
export function AppProviders({ children }: { children: React.ReactNode }): React.JSX.Element | null {
  const [i18nReady, setI18nReady] = useState(i18n.isInitialized);
  // The whole tree is laid out in this direction – it changes live with the language.
  const { directionStyle } = useDirection();

  useEffect(() => {
    let unmounted = false;
    // Set a safety timeout so app never remains stuck on black screen
    const timeout = setTimeout(() => {
      if (!unmounted) setI18nReady(true);
    }, 500);

    initI18n()
      // Match the layout direction to the saved / device language.
      .then(() => applyLayoutDirection(i18n.language))
      .catch(error => logger.error('i18n initialisation failed', error))
      .finally(() => {
        clearTimeout(timeout);
        if (!unmounted) setI18nReady(true);
      });

    return () => {
      unmounted = true;
      clearTimeout(timeout);
    };
  }, []);

  if (!i18nReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={ [styles.root, directionStyle] }>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <ThemeRoot>
            <StateProvider>
              {children}
              <FlashMessage position="top" />
            </StateProvider>
          </ThemeRoot>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

