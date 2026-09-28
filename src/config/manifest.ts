import fs from 'node:fs';
import path from 'node:path';
import { TEMPLATES_DIR } from '../utils/paths.js';
import type { GroupId, ManifestEntry, RenderContext, StateManagement } from '../core/types.js';

/**
 * Every file the generated app is made of, independent of the architecture.
 *
 * Architectures only decide *where* a group (or a single file) lives and may swap a
 * template for their own variant. Templates reference each other through
 * `{{IMPORT:<id>}}`, so moving a file never breaks its importers.
 */

const encrypted = (ctx: RenderContext) => ctx.options.apiEncryption;
const rtl = (ctx: RenderContext) => ctx.options.rtl;
const themeContext = (ctx: RenderContext) => ctx.options.themeContext;
const vectorIcons = (ctx: RenderContext) => ctx.options.vectorIcons;
const analytics = (ctx: RenderContext) => ctx.options.analytics;
const notifications = (ctx: RenderContext) => ctx.options.notifications;
const drawer = (ctx: RenderContext) => ctx.options.drawer;
const headerButtons = (ctx: RenderContext) => ctx.options.drawer || ctx.options.notifications;

/** Country flags for the phone number picker (templates/common/assets/flags/*.png). */
const COUNTRY_FLAGS = fs
  .readdirSync(path.join(TEMPLATES_DIR, 'common/assets/flags'))
  .filter(file => file.endsWith('.png'))
  .sort();

/** GolosText – bundled in `assets/fonts` and registered natively (see native/fonts.ts). */
export const APP_FONTS = ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black'].map(w => `GolosText-${w}.ttf`);

const NAMESPACES = ['common', 'auth', 'home', 'product', 'order'] as const;

const state =
  (...allowed: StateManagement[]) =>
  (ctx: RenderContext) =>
    allowed.includes(ctx.options.stateManagement);

function entries(group: GroupId, list: Array<[id: string, file: string, template?: string]>): ManifestEntry[] {
  return list.map(([id, file, template]) => ({
    id,
    group,
    file,
    template: template ?? `common/${group}/${file}`,
  }));
}

const socket = (ctx: RenderContext) => ctx.options.socket;
const chat = (ctx: RenderContext) => ctx.options.chat;
const authEmail = (ctx: RenderContext) => ctx.options.authEmail;
const authMobile = (ctx: RenderContext) => ctx.options.authMobile;
/** Phone number fields exist at sign-up (email auth) and on the mobile login screen. */
const phoneInput = (ctx: RenderContext) => ctx.options.authEmail || ctx.options.authMobile;
const hasSocialAuth = (ctx: RenderContext) => ctx.options.socialAuth !== 'none';

export const COMMON_MANIFEST: ManifestEntry[] = [
  // Project root. Dot-files are stored without the dot so `npm publish` keeps them.
  ...entries('root', [
    ['root.app', 'App.tsx'],
    ['root.index', 'index.js'],
    ['root.babel', 'babel.config.js'],
    ['root.tsconfig', 'tsconfig.json'],
    ['root.eslint', '.eslintrc.js', 'common/root/eslintrc.js'],
    ['root.prettier', '.prettierrc.js', 'common/root/prettierrc.js'],
    ['root.prettierignore', '.prettierignore', 'common/root/prettierignore'],
    ['root.gitignore', '.gitignore', 'common/root/gitignore'],
    ['root.envExample', '.env.example', 'common/root/env.example'],
    ['root.env', '.env', 'common/root/env.example'],
    ['root.jestConfig', 'jest.config.js'],
    ['root.rnConfig', 'react-native.config.js'],
    ['root.readme', 'README.md'],
    ['root.architectureDoc', 'docs/ARCHITECTURE.md'],
    ['root.firebaseReadme', 'firebase/README.md', 'common/root/firebase/README.md'],
    ['root.firebaseAndroidExample', 'firebase/google-services.json.example', 'common/root/firebase/google-services.json.example'],
    ['root.firebaseIosExample', 'firebase/GoogleService-Info.plist.example', 'common/root/firebase/GoogleService-Info.plist.example'],
    ['root.iosEntitlementsExample', 'firebase/App.entitlements.example', 'common/root/firebase/App.entitlements.example'],
    ['root.testLoginSchema', '__tests__/loginSchema.test.ts'],
    ['root.testTranslations', '__tests__/translations.test.ts'],
  ]),
  { ...entries('root', [['root.testApiEncryption', '__tests__/apiEncryption.test.ts']])[0]!, when: encrypted },

  ...entries('app', [['app.providers', 'AppProviders.tsx']]),
  { ...entries('app', [['app.themeContext', 'ThemeContext.tsx']])[0]!, when: themeContext },

  ...entries('assets', [['assets.readme', 'README.md']]),
  ...entries('assets', APP_FONTS.map(font => [`assets.font.${font}`, `fonts/${font}`] as [string, string])).map(e => ({
    ...e,
    binary: true,
  })),
  // Country picker (phone number fields): flags + dial codes.
  ...entries('assets', [['assets.countries', 'flags/countries.ts']]).map(e => ({ ...e, when: phoneInput })),
  ...entries('assets', COUNTRY_FLAGS.map(file => [`assets.flag.${file}`, `flags/${file}`] as [string, string])).map(e => ({
    ...e,
    binary: true,
    when: phoneInput,
  })),

  ...entries('theme', [
    ['theme.index', 'index.ts'],
    ['theme.colors', 'colors.ts'],
    ['theme.typography', 'typography.ts'],
    ['theme.spacing', 'spacing.ts'],
  ]),

  ...entries('config', [
    ['config.env', 'env.ts'],
    ['config.app', 'appConfig.ts'],
  ]),

  ...entries('types', [['types.env', 'env.d.ts']]),

  ...entries('i18n', [
    ['i18n.index', 'index.ts'],
    ['i18n.languages', 'languages.ts'],
    ['i18n.resources', 'resources.ts'],
    ['i18n.types', 'types.ts'],
    ['i18n.detector', 'languageDetector.ts'],
    ...(['en', 'hi'] as const).flatMap(lang =>
      NAMESPACES.map(ns => [`i18n.locale.${lang}.${ns}`, `locales/${lang}/${ns}.json`] as [string, string]),
    ),
  ]),
  // RTL: layout direction handling + Arabic as the sample right-to-left language.
  ...entries('i18n', [
    ['i18n.direction', 'direction.ts'],
    ...NAMESPACES.map(ns => [`i18n.locale.ar.${ns}`, `locales/ar/${ns}.json`] as [string, string]),
  ]).map(e => ({ ...e, when: rtl })),

  ...entries('utils', [
    ['utils.flashMessage', 'flashMessage.ts'],
    ['utils.logger', 'logger.ts'],
  ]),

  ...entries('hooks', [
    ['hooks.useLanguage', 'useLanguage.ts'],
    ['hooks.useImagePicker', 'useImagePicker.ts'],
    ['hooks.useSessionServices', 'useSessionServices.ts'],
    ['hooks.useTheme', 'useTheme.ts'],
  ]),
  { ...entries('hooks', [['hooks.useDirection', 'useDirection.ts']])[0]!, when: rtl },

  ...entries('api', [
    ['api.config', 'apiConfig.ts'],
    ['api.errors', 'apiErrors.ts'],
    ['api.client', 'apiClient.ts'],
    ['api.auth', 'authApi.ts'],
  ]),
  { ...entries('api', [['api.encryption', 'apiEncryption.ts']])[0]!, when: encrypted },

  ...entries('storage', [
    ['storage.keys', 'storageKeys.ts'],
    ['storage.service', 'storageService.ts'],
    ['storage.session', 'sessionStorage.ts'],
  ]),

  ...entries('notification', [
    ['notification.permissions', 'notificationPermissions.ts'],
    ['notification.token', 'notificationToken.ts'],
    ['notification.display', 'notificationDisplay.ts'],
    ['notification.handlers', 'notificationHandlers.ts'],
    ['notification.service', 'notificationService.ts'],
    // Notification types + tap routing: the one place to change notification behaviour.
    ['notification.types', 'notificationTypes.ts'],
    ['notification.inbox', 'notificationInbox.ts'],
    ['notification.api', 'notificationsApi.ts'],
    ['notification.router', 'notificationRouter.ts'],
    ['notification.useNotifications', 'useNotifications.ts'],
  ]).map(e => ({ ...e, when: notifications })),

  ...entries('permissions', [['permissions.service', 'permissionService.ts']]),

  ...entries('media', [['media.imagePicker', 'imagePicker.ts']]),

  ...entries('firebase', [['firebase.service', 'firebaseService.ts']]),
  { ...entries('firebase', [['firebase.analytics', 'analyticsService.ts']])[0]!, when: analytics },

  ...entries('components', [
    ['components.AppText', 'AppText/AppText.tsx'],
    ['components.AppLoader', 'AppLoader/AppLoader.tsx'],
    ['components.FadeInView', 'FadeInView/FadeInView.tsx'],
    ['components.AppButton', 'AppButton/AppButton.tsx'],
    ['components.AppInput', 'AppInput/AppInput.tsx'],
    ['components.LanguageSwitcher', 'LanguageSwitcher/LanguageSwitcher.tsx'],
    ['components.AppHeader', 'AppHeader/AppHeader.tsx'],
    ['components.AppWebView', 'AppWebView/AppWebView.tsx'],
    ['components.AppScreen', 'AppScreen/AppScreen.tsx'],
    ['components.MediaPickerModal', 'MediaPickerModal/MediaPickerModal.tsx'],
    ['components.MediaEditorModal', 'MediaEditorModal/MediaEditorModal.tsx'],
    ['components.LegalLinks', 'LegalLinks/LegalLinks.tsx'],
  ]),
  ...entries('components', [
    ['components.CountryPicker', 'CountryPicker/CountryPicker.tsx'],
    ['components.PhoneInput', 'PhoneInput/PhoneInput.tsx'],
  ]).map(e => ({ ...e, when: phoneInput })),
  { ...entries('components', [['components.AppIcon', 'AppIcon/AppIcon.tsx']])[0]!, when: vectorIcons },

  ...entries('navigation', [
    ['navigation.types', 'navigationTypes.ts'],
    ['navigation.ref', 'navigationRef.ts'],
    ['navigation.theme', 'navigationTheme.ts'],
    ['navigation.auth', 'AuthNavigator.tsx'],
    ['navigation.main', 'MainNavigator.tsx'],
    ['navigation.tabs', 'BottomTabNavigator.tsx'],
    ['navigation.homeStack', 'HomeStackNavigator.tsx'],
    ['navigation.app', 'AppNavigator.tsx'],
  ]),
  { ...entries('navigation', [['navigation.headerButtons', 'HeaderButtons.tsx']])[0]!, when: headerButtons },
  ...entries('navigation', [
    ['navigation.drawer', 'DrawerNavigator.tsx'],
    ['navigation.drawerContent', 'DrawerContent.tsx'],
  ]).map(e => ({ ...e, when: drawer })),

  ...entries('screens', [
    ['screens.Splash', 'SplashScreen/SplashScreen.tsx'],
    ['screens.Login', 'LoginScreen/LoginScreen.tsx'],
    ['screens.Home', 'HomeScreen/HomeScreen.tsx'],
    ['screens.Profile', 'ProfileScreen/ProfileScreen.tsx'],
    ['screens.EditProfile', 'EditProfileScreen/EditProfileScreen.tsx'],
    ['screens.WebView', 'WebViewScreen/WebViewScreen.tsx'],
    ['screens.Settings', 'SettingsScreen/SettingsScreen.tsx'],
  ]),
  { ...entries('screens', [['screens.Notifications', 'NotificationsScreen/NotificationsScreen.tsx']])[0]!, when: notifications },

  // Additional Auth Screens
  ...entries('auth', [
    ['auth.RegisterScreen', 'screens/RegisterScreen/RegisterScreen.tsx'],
    ['auth.ForgotPasswordScreen', 'screens/ForgotPasswordScreen/ForgotPasswordScreen.tsx'],
    ['auth.ResetPasswordScreen', 'screens/ResetPasswordScreen/ResetPasswordScreen.tsx'],
  ]).map(e => ({ ...e, when: authEmail })),

  ...entries('auth', [
    ['auth.MobileLoginScreen', 'screens/MobileLoginScreen/MobileLoginScreen.tsx'],
    ['auth.OtpVerifyScreen', 'screens/OtpVerifyScreen/OtpVerifyScreen.tsx'],
  ]).map(e => ({ ...e, when: authMobile })),

  // Social Auth Service + setup guide
  { ...entries('auth', [['auth.socialAuth', 'services/socialAuthService.ts']])[0]!, when: hasSocialAuth },
  { ...entries('root', [['root.socialLoginDoc', 'docs/SOCIAL_LOGIN.md']])[0]!, when: hasSocialAuth },

  ...entries('auth', [
    ['auth.types', 'types/auth.ts'],
    ['auth.schema', 'schemas/loginSchema.ts'],
    ['auth.form', 'components/LoginForm/LoginForm.tsx'],
  ]),
  { id: 'auth.logic', group: 'auth', file: 'hooks/useLogin.ts', template: 'common/auth/hooks/useLogin.ts', symbol: 'useLogin' },
  // `symbol`: the export other files use (`{{SYMBOL:auth.service}}`) – clean architecture exports `authRepository`.
  { id: 'auth.service', group: 'auth', file: 'services/authService.ts', template: 'common/auth/services/authService.ts', symbol: 'authService' },

  // Socket module
  ...entries('socket', [
    ['socket.service', 'socketService.ts'],
    ['socket.events', 'socketEvents.ts'],
  ]).map(e => ({ ...e, when: socket })),

  // Chat module
  ...entries('chat', [
    ['chat.types', 'types/chat.ts'],
    ['chat.endpoints', 'chatEndpoints.ts'],
    ['chat.service', 'services/chatService.ts'],
    ['chat.ChatListScreen', 'screens/ChatListScreen/ChatListScreen.tsx'],
    ['chat.ChatRoomScreen', 'screens/ChatRoomScreen/ChatRoomScreen.tsx'],
    ['chat.NewChatScreen', 'screens/NewChatScreen/NewChatScreen.tsx'],
    ['chat.ChatBubble', 'components/ChatBubble/ChatBubble.tsx'],
    ['chat.ChatInputBar', 'components/ChatInputBar/ChatInputBar.tsx'],
    ['chat.ChatMediaPreview', 'components/ChatMediaPreview/ChatMediaPreview.tsx'],
  ]).map(e => ({ ...e, when: chat })),

  // Session access is the only thing screens know about state; its implementation
  // depends on the selected state management.
  ...(['redux', 'zustand', 'context', 'none'] as const).map(
    (sm): ManifestEntry => ({
      id: 'hooks.useAuthSession',
      group: 'hooks',
      file: 'useAuthSession.ts',
      template: `state/${sm}/useAuthSession.ts`,
      when: state(sm),
    }),
  ),

  // Redux Toolkit
  ...entries('store', [
    ['store.index', 'index.ts', 'state/redux/store/index.ts'],
    ['store.rootReducer', 'rootReducer.ts', 'state/redux/store/rootReducer.ts'],
    ['store.hooks', 'hooks.ts', 'state/redux/store/hooks.ts'],
    ['store.authSlice', 'slices/authSlice.ts', 'state/redux/store/slices/authSlice.ts'],
    ['store.authSelectors', 'selectors/authSelectors.ts', 'state/redux/store/selectors/authSelectors.ts'],
  ]).map(e => ({ ...e, when: state('redux') })),

  // Zustand
  ...entries('store', [
    ['store.index', 'index.ts', 'state/zustand/store/index.ts'],
    ['store.authStore', 'authStore.ts', 'state/zustand/store/authStore.ts'],
  ]).map(e => ({ ...e, when: state('zustand') })),

  // Context API
  ...entries('store', [
    ['store.index', 'index.ts', 'state/context/store/index.ts'],
    ['store.authContext', 'AuthContext.tsx', 'state/context/store/AuthContext.tsx'],
  ]).map(e => ({ ...e, when: state('context') })),
];
