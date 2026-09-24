import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WebViewScreen } from '{{IMPORT:screens.WebView}}';
import { useSessionServices } from '{{IMPORT:hooks.useSessionServices}}';
import { BottomTabNavigator } from './BottomTabNavigator';
import type { MainStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<MainStackParamList>();

/**
 * Screens for signed-in users: the bottom tabs, plus screens pushed on top of them
 * (with the native stack header and back button).
 * - Add a tab: BottomTabNavigator.tsx.
 * - Add a pushed screen: register it below and add its params to MainStackParamList.
 * - Want a drawer instead of tabs? Replace `Tabs` with `<Stack.Screen name="Drawer" component={DrawerNavigator} />`.
 */
export function MainNavigator(): React.JSX.Element {
  useSessionServices();

  return (
    <Stack.Navigator screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="Tabs" component={BottomTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="WebView" component={WebViewScreen} options={({ route }) => ({ title: route.params.title ?? '' })} />
    </Stack.Navigator>
  );
}
