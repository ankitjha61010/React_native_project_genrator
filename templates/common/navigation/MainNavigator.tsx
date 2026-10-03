import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WebViewScreen } from '{{IMPORT:screens.WebView}}';
import { useSessionServices } from '{{IMPORT:hooks.useSessionServices}}';
import { EditProfileScreen } from '{{IMPORT:screens.EditProfile}}';
{{#if AUTH_EMAIL}}
import { ChangePasswordScreen } from '{{IMPORT:screens.ChangePassword}}';
{{/if}}
import { SettingsScreen } from '{{IMPORT:screens.Settings}}';
{{#if PAYMENTS}}
import { StoreScreen } from '{{IMPORT:payments.StoreScreen}}';
{{/if}}
{{#if GATEWAY_PAYPAL}}
import { PayPalCheckoutScreen } from '{{IMPORT:payments.PayPalCheckoutScreen}}';
{{/if}}
{{#if NOTIFICATIONS}}
import { NotificationsScreen } from '{{IMPORT:screens.Notifications}}';
{{/if}}
import { translate } from '{{IMPORT:i18n.index}}';
{{#if CHAT}}
import { ChatRoomScreen } from '{{IMPORT:chat.ChatRoomScreen}}';
import { ChatDetailsScreen } from '{{IMPORT:chat.ChatDetailsScreen}}';
import { NewChatScreen } from '{{IMPORT:chat.NewChatScreen}}';
import { BlockedUsersScreen } from '{{IMPORT:chat.BlockedUsersScreen}}';
{{#if GROUP_CHAT}}
import { CreateGroupScreen } from '{{IMPORT:chat.CreateGroupScreen}}';
import { GroupInfoScreen } from '{{IMPORT:chat.GroupInfoScreen}}';
{{/if}}
{{/if}}
{{#if HAS_CALLING}}
import { CallHistoryScreen } from '{{IMPORT:calling.CallHistoryScreen}}';
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
{{#if PAYMENTS}}
      <Stack.Screen name="Store" component={StoreScreen} options={{ title: translate('payments', 'storeTitle') }} />
{{/if}}
{{#if GATEWAY_PAYPAL}}
      <Stack.Screen name="PayPalCheckout" component={PayPalCheckoutScreen} options={{ title: translate('payments', 'paypalTitle'), presentation: 'modal' }} />
{{/if}}
{{#if NOTIFICATIONS}}
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: translate('common', 'notifications') }} />
{{/if}}
{{#if CHAT}}
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        // iOS 26 turns on "swipe anywhere to go back" – here that swipe means "reply", so only
        // the edge swipe goes back.
        options={{ headerShown: false, fullScreenGestureEnabled: false }}
      />
      <Stack.Screen name="ChatDetails" component={ChatDetailsScreen} options={{ title: translate('common', 'chatDetails') }} />
      <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: translate('common', 'newChat') }} />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ title: translate('common', 'blockedUsers') }} />
{{#if GROUP_CHAT}}
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: translate('common', 'newGroup') }} />
      <Stack.Screen name="GroupInfo" component={GroupInfoScreen} options={{ title: translate('common', 'groupInfo') }} />
{{/if}}
{{/if}}
{{#if HAS_CALLING}}
      <Stack.Screen name="CallHistory" component={CallHistoryScreen} options={{ title: 'Call History' }} />
{{/if}}
    </Stack.Navigator>
  );
}
