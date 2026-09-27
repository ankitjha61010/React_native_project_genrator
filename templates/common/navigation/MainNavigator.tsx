import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WebViewScreen } from '{{IMPORT:screens.WebView}}';
import { useSessionServices } from '{{IMPORT:hooks.useSessionServices}}';
import { EditProfileScreen } from '{{IMPORT:screens.EditProfile}}';
{{#if CHAT}}
import { ChatRoomScreen } from '{{IMPORT:chat.ChatRoomScreen}}';
{{/if}}
import { BottomTabNavigator } from './BottomTabNavigator';
import type { MainStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<MainStackParamList>();

/**
 * Screens for signed-in users: the bottom tabs, plus screens pushed on top of them
 * (with the native stack header and back button).
 */
export function MainNavigator(): React.JSX.Element {
  useSessionServices();

  return (
    <Stack.Navigator screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="Tabs" component={BottomTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="WebView" component={WebViewScreen} options={({ route }) => ({ title: route.params.title ?? '' })} />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
{{#if CHAT}}
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{ headerShown: false }}
      />
{{/if}}
    </Stack.Navigator>
  );
}
