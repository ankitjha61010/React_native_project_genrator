import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewProps } from 'react-native-webview';
import { AppButton } from '@presentation/components/AppButton';
import { AppLoader } from '@presentation/components/AppLoader';
import { AppText } from '@presentation/components/AppText';
import { useStyles } from '@presentation/hooks/useTheme';
import type { Theme } from '@presentation/theme';

export interface AppWebViewProps extends Omit<WebViewProps, 'source'> {
  url: string;
  /** Called with the page title once it is known. */
  onTitleChange?: (title: string) => void;
}

/** WebView with loading indicator and an error/retry state. */
export function AppWebView({ url, onTitleChange, style, ...rest }: AppWebViewProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  const webViewRef = useRef<WebView<object>>(null);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={styles.error}>
        <AppText intlType="common" value="networkError" align="center" />
        <AppButton
          intlType="common"
          value="retry"
          variant="outline"
          fullWidth={false}
          onPress={() => {
            setFailed(false);
            webViewRef.current?.reload();
          }}
        />
      </View>
    );
  }

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: url }}
      startInLoadingState
      renderLoading={() => <AppLoader overlay />}
      onError={() => setFailed(true)}
      onNavigationStateChange={state => {
        if (state.title) onTitleChange?.(state.title);
      }}
      style={[styles.webView, style]}
      {...rest}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    webView: {
      flex: theme.flexs.flexFull,
      backgroundColor: theme.colors.background,
    },
    error: {
      flex: theme.flexs.flexFull,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.spacing16,
      padding: theme.spacing.spacing24,
    },
  });
