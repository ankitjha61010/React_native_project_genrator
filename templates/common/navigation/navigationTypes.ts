import type { NavigatorScreenParams, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
};

/** The tabs of the signed-in home (BottomTabNavigator). */
export type BottomTabParamList = {
  HomeTab: undefined;
  SettingsTab: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<BottomTabParamList> | undefined;
  WebView: { url: string; title?: string };
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Main: NavigatorScreenParams<MainStackParamList> | undefined;
};

/** Used by the DrawerNavigator template. */
export type DrawerParamList = {
  HomeDrawer: undefined;
};

/** Navigation object that can reach every route: `useNavigation<RootNavigation>()`. */
export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

export type MainRouteProp<T extends keyof MainStackParamList> = RouteProp<MainStackParamList, T>;

declare global {
  namespace ReactNavigation {
    // Makes `useNavigation()` typed everywhere without generics.
    interface RootParamList extends RootStackParamList {}
  }
}
