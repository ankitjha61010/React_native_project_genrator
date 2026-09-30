import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@presentation/screens/LoginScreen';
import { WebViewScreen } from '@presentation/screens/WebViewScreen';
import { RegisterScreen } from '@features/auth/screens/RegisterScreen';
import { ForgotPasswordScreen } from '@features/auth/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@features/auth/screens/ResetPasswordScreen';
import type { AuthStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/** Screens available before the user signs in. */
export function AuthNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* Legal pages (native header + back button). */}
      <Stack.Screen
        name="WebView"
        component={WebViewScreen}
        options={({ route }) => ({ headerShown: true, headerBackButtonDisplayMode: 'minimal', title: route.params.title ?? '' })}
      />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}

