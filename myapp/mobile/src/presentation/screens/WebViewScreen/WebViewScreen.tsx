import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppScreen } from '@presentation/components/AppScreen';
import { AppWebView } from '@presentation/components/AppWebView';
import type { MainRouteProp } from '@presentation/navigation/navigationTypes';

/**
 * Opens any URL in-app: navigation.navigate('Main', { screen: 'WebView', params: { url } }).
 * The header (title + back button) is the native stack header from MainNavigator.
 */
export function WebViewScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { params } = useRoute<MainRouteProp<'WebView'>>();

  return (
    <AppScreen scroll={false} padded={false} edges={['bottom']}>
      <AppWebView
        url={params.url}
        onTitleChange={pageTitle => {
          // Use the page title when no title was passed.
          if (!params.title) navigation.setOptions({ title: pageTitle });
        }}
      />
    </AppScreen>
  );
}
