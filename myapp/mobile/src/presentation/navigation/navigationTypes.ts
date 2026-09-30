import type { NavigatorScreenParams, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  /** Terms & Conditions / Privacy Policy before sign-in. */
  WebView: { url: string; title?: string };
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string } | undefined;
};

/** The Home tab is a native stack, so Home gets the native header. */
export type HomeStackParamList = {
  Home: undefined;
};

/** The tabs of the signed-in home (BottomTabNavigator). */
export type BottomTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  ChatTab: undefined;
  ProfileTab: undefined;
};

/** The side drawer (DrawerNavigator); its only screen holds the bottom tabs. */
export type DrawerParamList = {
  HomeTabs: NavigatorScreenParams<BottomTabParamList> | undefined;
};

export type MainStackParamList = {
  Drawer: NavigatorScreenParams<DrawerParamList> | undefined;
  WebView: { url: string; title?: string };
  EditProfile: undefined;
  ChangePassword: undefined;
  Settings: undefined;
  /** `highlightId`: the notification that was tapped (shown highlighted). */
  Notifications: { highlightId?: string } | undefined;
  ChatRoom: {
    conversationId: string;
    title?: string;
    avatar?: string;
    isOnline?: boolean;
    isGroup?: boolean;
  };
  /** A direct chat's details: clear / delete the chat. */
  ChatDetails: { conversationId: string };
  NewChat: undefined;
  CreateGroup: undefined;
  GroupInfo: { conversationId: string };
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Main: NavigatorScreenParams<MainStackParamList> | undefined;
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
