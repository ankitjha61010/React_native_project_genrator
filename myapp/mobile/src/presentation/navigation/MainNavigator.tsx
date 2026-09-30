import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WebViewScreen } from '@presentation/screens/WebViewScreen';
import { useSessionServices } from '@presentation/hooks/useSessionServices';
import { EditProfileScreen } from '@presentation/screens/EditProfileScreen';
import { ChangePasswordScreen } from '@presentation/screens/ChangePasswordScreen';
import { SettingsScreen } from '@presentation/screens/SettingsScreen';
import { NotificationsScreen } from '@presentation/screens/NotificationsScreen';
import { translate } from '@infrastructure/i18n';
import { ChatRoomScreen } from '@features/chat/screens/ChatRoomScreen';
import { ChatDetailsScreen } from '@features/chat/screens/ChatDetailsScreen';
import { NewChatScreen } from '@features/chat/screens/NewChatScreen';
import { CreateGroupScreen } from '@features/chat/screens/CreateGroupScreen';
import { GroupInfoScreen } from '@features/chat/screens/GroupInfoScreen';
import { DrawerNavigator } from './DrawerNavigator';
import type { MainStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<MainStackParamList>();

/**
 * Screens for signed-in users: the drawer (around the bottom tabs), plus screens pushed on
 * top of them (with the native stack header and back button).
 */
export function MainNavigator(): React.JSX.Element {
  useSessionServices();

  return (
    <Stack.Navigator screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="Drawer" component={DrawerNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="WebView" component={WebViewScreen} options={({ route }) => ({ title: route.params.title ?? '' })} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: translate('common', 'editProfile') }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: translate('common', 'changePassword') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: translate('common', 'settings') }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: translate('common', 'notifications') }} />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="ChatDetails" component={ChatDetailsScreen} options={{ title: translate('common', 'chatDetails') }} />
      <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: translate('common', 'newChat') }} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: translate('common', 'newGroup') }} />
      <Stack.Screen name="GroupInfo" component={GroupInfoScreen} options={{ title: translate('common', 'groupInfo') }} />
    </Stack.Navigator>
  );
}
