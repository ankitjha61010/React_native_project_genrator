import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '@presentation/components/AppIcon';
import { useTheme } from '@presentation/hooks/useTheme';
import { useDirection } from '@presentation/hooks/useDirection';
import { translate } from '@infrastructure/i18n';
import { BottomTabNavigator } from './BottomTabNavigator';
import { DrawerContent } from './DrawerContent';
import type { DrawerParamList } from './navigationTypes';

function HomeIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="home-outline" size={size} tintColor={color} />;
}

const Drawer = createDrawerNavigator<DrawerParamList>();

function renderDrawerContent(props: React.ComponentProps<typeof DrawerContent>) {
  return <DrawerContent {...props} />;
}

/**
 * Side drawer around the bottom tabs: swipe from the edge or tap the menu button in
 * the header. Its items (Notifications, Settings, Log out) live in DrawerContent.
 * Add a screen here to get another drawer item.
 */
export function DrawerNavigator(): React.JSX.Element {
  const { theme } = useTheme();
  const { isRTL } = useDirection();
  useTranslation();

  return (
    <Drawer.Navigator
      drawerContent={renderDrawerContent}
      screenOptions={{
        // Every screen below brings its own (tab / native stack) header.
        headerShown: false,
        drawerType: 'front',
        // The drawer slides in from the start side: left in LTR, right in RTL.
        drawerPosition: isRTL ? 'right' : 'left',
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.text,
        drawerStyle: { backgroundColor: theme.colors.surface },
      }}>
      <Drawer.Screen
        name="HomeTabs"
        component={BottomTabNavigator}
        options={{
          title: translate('home', 'home'),
          drawerIcon: HomeIcon,
        }}
      />
    </Drawer.Navigator>
  );
}
