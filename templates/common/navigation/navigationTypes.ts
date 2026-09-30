import type { NavigatorScreenParams, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  /** Terms & Conditions / Privacy Policy before sign-in. */
  WebView: { url: string; title?: string };
{{#if AUTH_EMAIL}}
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string } | undefined;
{{/if}}
{{#if AUTH_MOBILE}}
  MobileLogin: undefined;
  OtpVerify: { countryCode: string; phone: string; resendIn?: number };
{{/if}}
};

/** The Home tab is a native stack, so Home gets the native header. */
export type HomeStackParamList = {
  Home: undefined;
};

/** The tabs of the signed-in home (BottomTabNavigator). */
export type BottomTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
{{#if CHAT}}
  ChatTab: undefined;
{{/if}}
  ProfileTab: undefined;
};

{{#if DRAWER}}
/** The side drawer (DrawerNavigator); its only screen holds the bottom tabs. */
export type DrawerParamList = {
  HomeTabs: NavigatorScreenParams<BottomTabParamList> | undefined;
};

{{/if}}
export type MainStackParamList = {
{{#if DRAWER}}
  Drawer: NavigatorScreenParams<DrawerParamList> | undefined;
{{else}}
  Tabs: NavigatorScreenParams<BottomTabParamList> | undefined;
{{/if}}
  WebView: { url: string; title?: string };
  EditProfile: undefined;
{{#if AUTH_EMAIL}}
  ChangePassword: undefined;
{{/if}}
  Settings: undefined;
{{#if NOTIFICATIONS}}
  /** `highlightId`: the notification that was tapped (shown highlighted). */
  Notifications: { highlightId?: string } | undefined;
{{/if}}
{{#if CHAT}}
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
{{#if GROUP_CHAT}}
  CreateGroup: undefined;
  GroupInfo: { conversationId: string };
{{/if}}
{{/if}}
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
