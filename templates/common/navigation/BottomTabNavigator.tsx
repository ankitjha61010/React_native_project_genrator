import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { useTheme } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import { ProfileScreen } from '{{IMPORT:screens.Profile}}';
{{#if CHAT}}
import { ChatListScreen } from '{{IMPORT:chat.ChatListScreen}}';
{{/if}}
{{#if HAS_CALLING}}
import { CallHistoryScreen } from '{{IMPORT:calling.CallHistoryScreen}}';
{{/if}}
{{#if DRAWER}}
import { renderDrawerButton } from './HeaderButtons';
{{/if}}
import { HomeStackNavigator } from './HomeStackNavigator';
import type { BottomTabParamList } from './navigationTypes';

{{#if VECTOR_ICONS}}
function HomeIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="home-outline" size={size} tintColor={color} />;
}

function ProfileIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="account-outline" size={size} tintColor={color} />;
}
{{/if}}

{{#if CHAT}}
{{#if VECTOR_ICONS}}
function ChatIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="chat-outline" size={size} tintColor={color} />;
}
{{/if}}
{{/if}}

{{#if HAS_CALLING}}
{{#if VECTOR_ICONS}}
function PhoneIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="phone-outline" size={size} tintColor={color} />;
}
{{/if}}
{{/if}}

const Tab = createBottomTabNavigator<BottomTabParamList>();

/**
 * The signed-in home: a bottom tab bar. Home is a native stack (native header with
 * {{#if DRAWER}}the drawer button and {{/if}}{{#if NOTIFICATIONS}}the notification bell{{else}}its own title{{/if}}); the other tabs use the tab header.
 */
export function BottomTabNavigator(): React.JSX.Element {
  const { theme } = useTheme();
  // Re-renders the header and tab titles when the language changes.
  useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
{{#if DRAWER}}
        headerLeft: renderDrawerButton,
        headerLeftContainerStyle: { paddingStart: 12 },
{{/if}}
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
      }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: translate('home', 'home'),
          // HomeStackNavigator draws the native header.
          headerShown: false,
{{#if VECTOR_ICONS}}
          tabBarIcon: HomeIcon,
{{/if}}
        }}
      />
{{#if CHAT}}
      <Tab.Screen
        name="ChatTab"
        component={ChatListScreen}
        options={{
          title: 'Chats',
{{#if VECTOR_ICONS}}
          tabBarIcon: ChatIcon,
{{/if}}
        }}
      />
{{/if}}
{{#if HAS_CALLING}}
      <Tab.Screen
        name="CallsTab"
        component={CallHistoryScreen}
        options={{
          title: 'Calls',
{{#if VECTOR_ICONS}}
          tabBarIcon: PhoneIcon,
{{/if}}
        }}
      />
{{/if}}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
{{#if VECTOR_ICONS}}
          tabBarIcon: ProfileIcon,
{{/if}}
        }}
      />
    </Tab.Navigator>
  );
}
