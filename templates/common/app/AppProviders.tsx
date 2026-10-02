import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
{{#if STATE_REDUX}}
import { Provider as ReduxProvider } from 'react-redux';
{{/if}}
{{#if RTL}}
import { useDirection } from '{{IMPORT:hooks.useDirection}}';
import { applyLayoutDirection, i18n, initI18n } from '{{IMPORT:i18n.index}}';
{{else}}
import { i18n, initI18n } from '{{IMPORT:i18n.index}}';
{{/if}}
{{#if STATE_REDUX}}
import { store } from '{{IMPORT:store.index}}';
{{/if}}
{{#if STATE_CONTEXT}}
import { AuthProvider } from '{{IMPORT:store.index}}';
{{/if}}
import { logger } from '{{IMPORT:utils.logger}}';
{{#if THEME_CONTEXT}}
import { ThemeProvider } from './ThemeContext';
{{/if}}
{{#if HAS_CALLING}}
import { CallProvider } from '{{IMPORT:calling.CallContext}}';
{{/if}}
{{#if OTA}}
import { markLaunchSuccessful } from '{{IMPORT:ota.service}}';
import { OTAUpdateModal } from '{{IMPORT:ota.modal}}';
{{/if}}

{{#if THEME_CONTEXT}}
// Light / dark / system theme – read it anywhere with useTheme().
const ThemeRoot = ThemeProvider;
{{else}}
// Static light theme (generated without a ThemeContext) – see hooks/useTheme.ts.
function ThemeRoot({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
{{/if}}

{{#if STATE_REDUX}}
function StateProvider({ children }: { children: React.ReactNode }) {
  return <ReduxProvider store={store}>{children}</ReduxProvider>;
}
{{/if}}
{{#if STATE_CONTEXT}}
const StateProvider = AuthProvider;
{{/if}}
{{#if STATE_ZUSTAND}}
// Zustand stores need no provider.
function StateProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
{{/if}}
{{#if STATE_NONE}}
function StateProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
{{/if}}

/** Every app-wide provider, in one place. */
export function AppProviders({ children }: { children: React.ReactNode }): React.JSX.Element | null {
  const [i18nReady, setI18nReady] = useState(i18n.isInitialized);
{{#if RTL}}
  // The whole tree is laid out in this direction – it changes live with the language.
  const { directionStyle } = useDirection();
{{/if}}

  useEffect(() => {
    let unmounted = false;
    // Set a safety timeout so app never remains stuck on black screen
    const timeout = setTimeout(() => {
      if (!unmounted) setI18nReady(true);
    }, 500);

    initI18n()
{{#if RTL}}
      // Match the layout direction to the saved / device language.
      .then(() => applyLayoutDirection(i18n.language))
{{/if}}
      .catch(error => logger.error('i18n initialisation failed', error))
      .finally(() => {
        clearTimeout(timeout);
        if (!unmounted) setI18nReady(true);
      });

{{#if OTA}}
    markLaunchSuccessful();
{{/if}}

    return () => {
      unmounted = true;
      clearTimeout(timeout);
    };
  }, []);

  if (!i18nReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={ {{#if RTL}}[styles.root, directionStyle]{{else}}styles.root{{/if}} }>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <ThemeRoot>
            <StateProvider>
{{#if HAS_CALLING}}
              <CallProvider>
                {children}
                <FlashMessage position="top" />
{{#if OTA}}
                <OTAUpdateModal />
{{/if}}
              </CallProvider>
{{else}}
                {children}
                <FlashMessage position="top" />
{{#if OTA}}
                <OTAUpdateModal />
{{/if}}
{{/if}}
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

