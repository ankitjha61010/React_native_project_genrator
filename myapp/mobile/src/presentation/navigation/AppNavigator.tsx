import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { analyticsService } from '@infrastructure/firebase/analyticsService';
import { useDirection } from '@presentation/hooks/useDirection';
import { SplashScreen } from '@presentation/screens/SplashScreen';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { navigationRef } from './navigationRef';
import { useNavigationTheme } from './navigationTheme';
import type { RootStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root flow: Splash → Auth (Login) → Main (bottom tabs + pushed screens).
 * `direction` is passed explicitly (and changes live with the language) so native headers, the
 * back arrow, the drawer and gestures always follow the app's direction (i18n/direction.ts),
 * never the device locale – and never need a restart.
 */
export function AppNavigator(): React.JSX.Element {
  const navigationTheme = useNavigationTheme();
  const { direction } = useDirection();
  const currentRoute = useRef<string | undefined>(undefined);

  const trackScreen = () => {
    const name = navigationRef.getCurrentRoute()?.name;
    if (name && name !== currentRoute.current) {
      currentRoute.current = name;
      analyticsService.logScreen(name);
    }
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} direction={direction} onReady={trackScreen} onStateChange={trackScreen}>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
