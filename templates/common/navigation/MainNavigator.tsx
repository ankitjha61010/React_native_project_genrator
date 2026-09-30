import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WebViewScreen } from '{{IMPORT:screens.WebView}}';
import { useSessionServices } from '{{IMPORT:hooks.useSessionServices}}';
import { EditProfileScreen } from '{{IMPORT:screens.EditProfile}}';
{{#if AUTH_EMAIL}}
import { ChangePasswordScreen } from '{{IMPORT:screens.ChangePassword}}';
{{/if}}
import { SettingsScreen } from '{{IMPORT:screens.Settings}}';
{{#if NOTIFICATIONS}}
import { NotificationsScreen } from '{{IMPORT:screens.Notifications}}';
{{/if}}
import { translate } from '{{IMPORT:i18n.index}}';
{{#if CHAT}}
import { ChatRoomScreen } from '{{IMPORT:chat.ChatRoomScreen}}';
import { ChatDetailsScreen } from '{{IMPORT:chat.ChatDetailsScreen}}';
import { NewChatScreen } from '{{IMPORT:chat.NewChatScreen}}';
{{#if GROUP_CHAT}}
import { CreateGroupScreen } from '{{IMPORT:chat.CreateGroupScreen}}';
import { GroupInfoScreen } from '{{IMPORT:chat.GroupInfoScreen}}';
{{/if}}
{{/if}}
{{#if DRAWER}}
import { DrawerNavigator } from './DrawerNavigator';
{{else}}
import { BottomTabNavigator } from './BottomTabNavigator';
{{/if}}
import type { MainStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<MainStackParamList>();

/**
 * Screens for signed-in users: the {{#if DRAWER}}drawer (around the bottom tabs){{else}}bottom tabs{{/if}}, plus screens pushed on
 * top of them (with the native stack header and back button).
 */
export function MainNavigator(): React.JSX.Element {
  useSessionServices();

  return (
    <Stack.Navigator screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
{{#if DRAWER}}
      <Stack.Screen name="Drawer" component={DrawerNavigator} options={{ headerShown: false }} />
{{else}}
      <Stack.Screen name="Tabs" component={BottomTabNavigator} options={{ headerShown: false }} />
{{/if}}
      <Stack.Screen name="WebView" component={WebViewScreen} options={({ route }) => ({ title: route.params.title ?? '' })} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: translate('common', 'editProfile') }} />
{{#if AUTH_EMAIL}}
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: translate('common', 'changePassword') }} />
{{/if}}
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: translate('common', 'settings') }} />
{{#if NOTIFICATIONS}}
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: translate('common', 'notifications') }} />
{{/if}}
{{#if CHAT}}
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="ChatDetails" component={ChatDetailsScreen} options={{ title: translate('common', 'chatDetails') }} />
      <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: translate('common', 'newChat') }} />
{{#if GROUP_CHAT}}
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: translate('common', 'newGroup') }} />
      <Stack.Screen name="GroupInfo" component={GroupInfoScreen} options={{ title: translate('common', 'groupInfo') }} />
{{/if}}
{{/if}}
    </Stack.Navigator>
  );
}
