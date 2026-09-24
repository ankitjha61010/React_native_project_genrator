import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { useTheme } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import { HomeScreen } from '{{IMPORT:screens.Home}}';
import { SettingsScreen } from '{{IMPORT:screens.Settings}}';
import type { BottomTabParamList } from './navigationTypes';

{{#if VECTOR_ICONS}}
function HomeIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="home-outline" size={size} tintColor={color} />;
}

function SettingsIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="cog-outline" size={size} tintColor={color} />;
}

{{/if}}
const Tab = createBottomTabNavigator<BottomTabParamList>();

/**
 * The signed-in home: a bottom tab bar, each tab with its own header.
 * Add a tab: add the screen here and its route to BottomTabParamList.
 */
export function BottomTabNavigator(): React.JSX.Element {
  const { theme } = useTheme();
  // Re-renders the header and tab titles when the language changes.
  useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
      }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: translate('home', 'home'),
{{#if VECTOR_ICONS}}
          tabBarIcon: HomeIcon,
{{/if}}
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: translate('common', 'settings'),
{{#if VECTOR_ICONS}}
          tabBarIcon: SettingsIcon,
{{/if}}
        }}
      />
    </Tab.Navigator>
  );
}
