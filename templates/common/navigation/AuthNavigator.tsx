import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '{{IMPORT:screens.Login}}';
import { WebViewScreen } from '{{IMPORT:screens.WebView}}';
{{#if AUTH_EMAIL}}
import { RegisterScreen } from '{{IMPORT:auth.RegisterScreen}}';
import { ForgotPasswordScreen } from '{{IMPORT:auth.ForgotPasswordScreen}}';
import { ResetPasswordScreen } from '{{IMPORT:auth.ResetPasswordScreen}}';
{{/if}}
{{#if AUTH_MOBILE}}
import { MobileLoginScreen } from '{{IMPORT:auth.MobileLoginScreen}}';
import { OtpVerifyScreen } from '{{IMPORT:auth.OtpVerifyScreen}}';
{{/if}}
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
{{#if AUTH_EMAIL}}
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
{{/if}}
{{#if AUTH_MOBILE}}
      <Stack.Screen name="MobileLogin" component={MobileLoginScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
{{/if}}
    </Stack.Navigator>
  );
}

