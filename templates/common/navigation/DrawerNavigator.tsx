import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTranslation } from 'react-i18next';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { useTheme } from '{{IMPORT:hooks.useTheme}}';
{{#if RTL}}
import { useDirection } from '{{IMPORT:hooks.useDirection}}';
{{/if}}
import { translate } from '{{IMPORT:i18n.index}}';
import { BottomTabNavigator } from './BottomTabNavigator';
import { DrawerContent } from './DrawerContent';
import type { DrawerParamList } from './navigationTypes';

{{#if VECTOR_ICONS}}
function HomeIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon name="home-outline" size={size} tintColor={color} />;
}
{{/if}}

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
{{#if RTL}}
  const { isRTL } = useDirection();
{{/if}}
  useTranslation();

  return (
    <Drawer.Navigator
      drawerContent={renderDrawerContent}
      screenOptions={{
        // Every screen below brings its own (tab / native stack) header.
        headerShown: false,
        drawerType: 'front',
{{#if RTL}}
        // The drawer slides in from the start side: left in LTR, right in RTL.
        drawerPosition: isRTL ? 'right' : 'left',
{{/if}}
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.text,
        drawerStyle: { backgroundColor: theme.colors.surface },
      }}>
      <Drawer.Screen
        name="HomeTabs"
        component={BottomTabNavigator}
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
