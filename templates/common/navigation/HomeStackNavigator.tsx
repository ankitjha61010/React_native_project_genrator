import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { translate } from '{{IMPORT:i18n.index}}';
import { HomeScreen } from '{{IMPORT:screens.Home}}';
{{#if DRAWER}}
{{#if NOTIFICATIONS}}
import { renderDrawerButton, renderNotificationBell } from './HeaderButtons';
{{else}}
import { renderDrawerButton } from './HeaderButtons';
{{/if}}
{{else}}
{{#if NOTIFICATIONS}}
import { renderNotificationBell } from './HeaderButtons';
{{/if}}
{{/if}}
import type { HomeStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<HomeStackParamList>();

/**
 * The Home tab. A native stack so Home gets the platform's NATIVE header
 * (UINavigationBar / Android toolbar) – no custom header component.
 */
export function HomeStackNavigator(): React.JSX.Element {
  // Re-renders the header title when the language changes.
  useTranslation();

  return (
    <Stack.Navigator screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: translate('home', 'home'),
{{#if DRAWER}}
          headerLeft: renderDrawerButton,
{{/if}}
{{#if NOTIFICATIONS}}
          headerRight: renderNotificationBell,
{{/if}}
        }}
      />
    </Stack.Navigator>
  );
}
