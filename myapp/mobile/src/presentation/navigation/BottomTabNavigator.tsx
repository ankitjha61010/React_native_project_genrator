import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '@presentation/components/AppIcon';
import { useTheme } from '@presentation/hooks/useTheme';
import { translate } from '@infrastructure/i18n';
import { ProfileScreen } from '@presentation/screens/ProfileScreen';
import { ChatListScreen } from '@features/chat/screens/ChatListScreen';
import { renderDrawerButton } from './HeaderButtons';
import { HomeStackNavigator } from './HomeStackNavigator';
import type { BottomTabParamList } from './navigationTypes';

function HomeIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="home-outline" size={size} tintColor={color} />;
}

function ProfileIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="account-outline" size={size} tintColor={color} />;
}

function ChatIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="chat-outline" size={size} tintColor={color} />;
}

const Tab = createBottomTabNavigator<BottomTabParamList>();

/**
 * The signed-in home: a bottom tab bar. Home is a native stack (native header with
 * the drawer button and the notification bell); the other tabs use the tab header.
 */
export function BottomTabNavigator(): React.JSX.Element {
  const { theme } = useTheme();
  // Re-renders the header and tab titles when the language changes.
  useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerLeft: renderDrawerButton,
        headerLeftContainerStyle: { paddingStart: 12 },
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
          tabBarIcon: HomeIcon,
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatListScreen}
        options={{
          title: 'Chats',
          tabBarIcon: ChatIcon,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ProfileIcon,
        }}
      />
    </Tab.Navigator>
  );
}
