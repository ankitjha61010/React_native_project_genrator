import React{{#if ANALYTICS}}, { useRef }{{/if}} from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
{{#if ANALYTICS}}
import { analyticsService } from '{{IMPORT:firebase.analytics}}';
{{/if}}
{{#if RTL}}
import { currentDirection } from '{{IMPORT:i18n.index}}';
{{/if}}
import { SplashScreen } from '{{IMPORT:screens.Splash}}';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { navigationRef } from './navigationRef';
import { useNavigationTheme } from './navigationTheme';
import type { RootStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root flow: Splash → Auth (Login) → Main (bottom tabs + pushed screens).{{#if RTL}}
 * `direction` is passed explicitly so native headers, the drawer and gestures always follow the
 * app's direction (i18n/direction.ts), never the device locale.{{/if}}
 */
export function AppNavigator(): React.JSX.Element {
  const navigationTheme = useNavigationTheme();
{{#if ANALYTICS}}
  const currentRoute = useRef<string | undefined>(undefined);

  const trackScreen = () => {
    const name = navigationRef.getCurrentRoute()?.name;
    if (name && name !== currentRoute.current) {
      currentRoute.current = name;
      analyticsService.logScreen(name);
    }
  };
{{/if}}

  return (
{{#if ANALYTICS}}
    <NavigationContainer ref={navigationRef} theme={navigationTheme}{{#if RTL}} direction={currentDirection()}{{/if}} onReady={trackScreen} onStateChange={trackScreen}>
{{else}}
    <NavigationContainer ref={navigationRef} theme={navigationTheme}{{#if RTL}} direction={currentDirection()}{{/if}}>
{{/if}}
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
