import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { useTheme } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import { HomeScreen } from '{{IMPORT:screens.Home}}';
import type { DrawerParamList } from './navigationTypes';

{{#if VECTOR_ICONS}}
function HomeIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="home-outline" size={size} tintColor={color} />;
}
{{/if}}

const Drawer = createDrawerNavigator<DrawerParamList>();

/**
 * TEMPLATE – not mounted by default.
 *
 * Enable it in MainNavigator:
 *   1. add `Drawer: NavigatorScreenParams<DrawerParamList>` to MainStackParamList,
 *   2. replace the `Tabs` screen with `<Stack.Screen name="Drawer" component={DrawerNavigator} options={{ headerShown: false }} />`.
 * Requires react-native-gesture-handler + react-native-reanimated (already configured).
 */
export function DrawerNavigator(): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.tabInactive,
      }}>
      <Drawer.Screen
        name="HomeDrawer"
        component={HomeScreen}
        options={{
          title: translate('home', 'home'),
{{#if VECTOR_ICONS}}
          drawerIcon: HomeIcon,
{{/if}}
        }}
      />
    </Drawer.Navigator>
  );
}
