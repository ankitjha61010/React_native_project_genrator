# {{DISPLAY_NAME}}

React Native {{RN_VERSION}} + TypeScript app generated with **rn-architecture-generator**.

- **Architecture:** {{ARCHITECTURE_NAME}} – {{ARCHITECTURE_SUMMARY}}
- **State management:** {{STATE_MANAGEMENT_NAME}}
- **Android package / iOS bundle id:** `{{PACKAGE_NAME}}`

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deep dive into the architecture.

---

## Table of contents

1. [Dependencies](#dependencies)
2. [Folder structure](#folder-structure)
3. [Installation](#installation)
4. [Running Android](#running-android)
5. [Running iOS](#running-ios)
6. [Firebase setup](#firebase-setup)
7. [Notification setup](#notification-setup)
{{#if HAS_SOCIAL_AUTH}}
   - [Social login](#social-login)
{{/if}}
8. [Environment variables](#environment-variables)
9. [Navigation](#navigation)
10. [State management](#state-management)
11. [Localization (i18n)](#localization-i18n)
12. [Adding screens](#adding-screens)
13. [Services](#services)
14. [Theme & fonts](#theme--fonts)
15. [Scripts](#scripts)
16. [Building a production APK/AAB](#building-a-production-apkaab)
17. [Building iOS](#building-ios)

---

## Dependencies

| Area | Packages |
| --- | --- |
| Navigation | `@react-navigation/native`, `native-stack`, `bottom-tabs`, `drawer`, `react-native-screens`, `react-native-safe-area-context` |
| Gestures & animation | `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets` |
{{#if ANALYTICS}}
| Firebase & notifications | `@react-native-firebase/app`, `messaging`, `analytics`, `@notifee/react-native` |
{{else}}
| Firebase & notifications | `@react-native-firebase/app`, `messaging`, `@notifee/react-native` |
{{/if}}
| Networking | `axios` (single client with interceptors) |
{{#if API_ENCRYPTION}}
| API encryption | `crypto-js` (AES-256-CBC request/response encryption) |
{{/if}}
{{#if STORAGE_MMKV}}
| Storage | `react-native-mmkv` + `react-native-nitro-modules` (behind a replaceable adapter) |
{{else}}
| Storage | `@react-native-async-storage/async-storage` (behind a replaceable adapter) |
{{/if}}
{{#if RTL}}
| RTL | `react-native-restart` (restarts once when the layout direction changes) |
{{/if}}
| Forms | `react-hook-form`, `zod`, `@hookform/resolvers` |
| i18n | `i18next`, `react-i18next`, `react-native-localize` |
{{#if VECTOR_ICONS}}
| UI | `react-native-flash-message`, `@react-native-vector-icons/material-design-icons`, `react-native-webview` |
{{else}}
| UI | `react-native-flash-message`, `react-native-webview` |
{{/if}}
| Media & permissions | `react-native-image-picker`, `react-native-permissions`, `@react-native-community/image-editor` (crop), `@shopify/react-native-skia` + `react-native-file-access` (photo filters) |
{{#if HAS_SOCIAL_AUTH}}
| Social login |{{#if SOCIAL_GOOGLE}} `@react-native-google-signin/google-signin`{{/if}}{{#if SOCIAL_FACEBOOK}} `react-native-fbsdk-next`{{/if}}{{#if SOCIAL_APPLE}} `@invertase/react-native-apple-authentication`{{/if}} |
{{/if}}
{{#if STATE_REDUX}}
| State | `@reduxjs/toolkit`, `react-redux` |
{{/if}}
{{#if STATE_ZUSTAND}}
| State | `zustand` |
{{/if}}
| Tooling | TypeScript, ESLint, Prettier, Jest, `react-native-dotenv`, `babel-plugin-module-resolver`, `@babel/plugin-transform-export-namespace-from` (needed by zod v4) |

Every version is pinned and was verified against React Native {{RN_VERSION}}. Upgrade them together
(`npx react-native upgrade` + the libraries' changelogs) rather than one by one.


## Folder structure

```text
{{ARCHITECTURE_TREE}}
```

Every folder in `src/` has its own `@` alias, so files can move without `../../..` chains. The aliases
are configured in `babel.config.js` and `tsconfig.json` (keep the two in sync):

| Alias | Folder |
| --- | --- |
{{ALIAS_TABLE}}

```ts
import { AppText } from '{{IMPORT:components.AppText}}';
import { useTheme } from '{{IMPORT:hooks.useTheme}}';
```

## Installation

Requirements: Node ≥ 22.13, Watchman (macOS), JDK 17, Android Studio, and Xcode + CocoaPods for iOS.
See https://reactnative.dev/docs/set-up-your-environment.

```bash
npm install
cp .env.example .env        # already done by the generator
```

iOS only:

```bash
bundle install              # once
cd ios && bundle exec pod install && cd ..
```

## Running Android

```bash
npm start                   # Metro, in its own terminal
npm run android             # or: npx react-native run-android
```

## Running iOS

```bash
npm start
npm run ios                 # or: npx react-native run-ios
```

**Node path for Xcode.** `ios/.xcode.env` finds `node` through nvm, fnm, Volta, asdf, Homebrew or your
PATH, so upgrading Node never breaks the build. Don't put an absolute node path in it. If you need a
machine specific override, use `ios/.xcode.env.local` (git-ignored). The Podfile keeps that file free
of the hard-coded path `pod install` would otherwise write into it.

**Firebase + CocoaPods.** The Podfile uses static frameworks with `$RNFirebaseDisableSPM = true`, so the
Firebase SDK comes from CocoaPods. Firebase's Swift packages can't be linked into static frameworks:
they fail with duplicate symbols.

## Firebase setup

The project runs **without** Firebase – {{#if ANALYTICS}}analytics and push are{{else}}push notifications are{{/if}} simply disabled and a warning is logged.
To enable them follow [firebase/README.md](firebase/README.md):

1. Create a Firebase project.
2. Download `google-services.json` → `android/app/google-services.json`.
3. Download `GoogleService-Info.plist` → add it to the `{{APP_NAME}}` target in Xcode.
4. Configure Firebase Messaging (APNs key for iOS).

Nothing in this repository contains real Firebase credentials.

## Notification setup

Code lives in `{{DIR_NOTIFICATION}}`:

| File | Responsibility |
| --- | --- |
| `notificationPermissions.ts` | Ask/check permission (iOS + Android 13 `POST_NOTIFICATIONS`) |
| `notificationToken.ts` | Get / refresh the FCM token – **TODO: send it to your backend** in `syncFcmToken` |
| `notificationDisplay.ts` | `displayNotification(message)` – shows an FCM message with Notifee (Android channel `default`) |
| `notificationHandlers.ts` | `registerNotificationHandlers()` (called in `index.js`) and tap handling |
| `notificationService.ts` | `notificationService.initialize()` – permission, token, tap listeners |

**Entry point (`index.js`)**: `registerNotificationHandlers()` runs before the app renders and registers:

| Handler | When | What happens |
| --- | --- | --- |
| `onMessage` | App in the foreground | The OS shows nothing, so `displayNotification` shows it with Notifee |
| `setBackgroundMessageHandler` | App in the background / killed | Notification messages are shown by the OS; data-only messages (`data.title` / `data.body`) are shown with Notifee |
| `notifee.onBackgroundEvent` | Notifee notification pressed in the background | The press is stored and replayed when the app opens |

`useSessionServices` (mounted by `MainNavigator`) initialises notifications after login and opens `data.url`
in the in-app WebView when a notification is tapped. Taps are reported whether FCM or Notifee showed the
notification and whatever state the app was in.

{{#if NOTIFICATIONS}}
### Notification types and taps

**Every notification type is defined in one file: `{{PATH_NOTIFICATION_TYPES}}`.** Change or add types there; the
handlers, the inbox and the Notifications screen all read from it.

The backend sends the type in the FCM **data** payload:

```json
{
  "notification": { "title": "Jane", "body": "Hi there 👋" },
  "data": { "type": "chat", "conversationId": "conv_1", "senderName": "Jane" }
}
```

| `data.type` | Tap on the push notification opens |
| --- | --- |
{{#if CHAT}}
| `chat` | The conversation (`ChatRoom` with `data.conversationId`); the Notifications screen if the id is missing |
{{else}}
| `chat` | The Notifications screen (enable the chat module to open conversations) |
{{/if}}
| `order`, `promotion`, `account`, `general`, unknown or missing | The **Notifications** screen, with the tapped item highlighted |

Every received notification is stored in the inbox (`{{PATH_NOTIFICATION_INBOX}}`, newest first, max 100) and listed on
the Notifications screen with an unread badge in the Home header. Tapping a row opens its target;
if it has none, a `data.url` opens in the in-app browser. Signing out clears the inbox.
If your backend keeps the notification history, load it in `notificationInbox.reload()`.

| File | Responsibility |
| --- | --- |
| `{{PATH_NOTIFICATION_TYPES}}` | **Types, labels, icons and where a tap goes** |
| `{{PATH_NOTIFICATION_ROUTER}}` | `handleNotificationTap` (push taps) and `openNotification` (inbox rows) |
| `{{PATH_NOTIFICATION_INBOX}}` | Stored list + read state; `{{PATH_NOTIFICATION_USENOTIFICATIONS}}` is its React hook |
| `{{PATH_SCREENS_NOTIFICATIONS}}` | The Notifications screen |

Test with the Firebase console → *Messaging* → *Send test message* using the token printed in Metro
(add `type` / `conversationId` under *Additional options → Custom data*).
{{else}}
Test with the Firebase console → *Messaging* → *Send test message* using the token printed in Metro.
{{/if}}

{{#if HAS_SOCIAL_AUTH}}
## Social login

The login screen offers {{SOCIAL_PROVIDER_NAMES}}.
The code and all native setup are done, but **every key is a `YOUR_…` placeholder**. Replace them before you test.

| Where | What to replace |
| --- | --- |
{{#if SOCIAL_GOOGLE}}
| `.env` | `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID` |
{{/if}}
{{#if SOCIAL_GOOGLE}}
| `ios/{{APP_NAME}}/Info.plist` | Google: reversed iOS client ID URL scheme |
{{/if}}
{{#if SOCIAL_FACEBOOK}}
| `ios/{{APP_NAME}}/Info.plist` | Facebook: `FacebookAppID`, `FacebookClientToken`, `fb<APP_ID>` URL scheme |
| `android/app/src/main/res/values/strings.xml` | Facebook: `facebook_app_id`, `facebook_client_token`, `fb_login_protocol_scheme` |
{{/if}}
{{#if SOCIAL_APPLE}}
| Apple Developer portal / Xcode | Enable *Sign in with Apple* for `{{PACKAGE_NAME}}` (entitlement already added) |
{{/if}}

Step-by-step guide (consoles, SHA-1 and key hashes, backend token verification): [docs/SOCIAL_LOGIN.md](docs/SOCIAL_LOGIN.md).

{{/if}}
## Environment variables

`.env` is loaded at build time through `react-native-dotenv` and typed in `{{PATH_TYPES_ENV}}`.

| Variable | Description |
| --- | --- |
| `API_BASE_URL` | Base URL used by the Axios client |
| `APP_ENV` | `development` \| `staging` \| `production` |
| `TERMS_URL` | Terms & Conditions page – opened in the in-app WebView from Login, Profile{{#if DRAWER}} and the drawer{{/if}} (dummy URL, replace it) |
| `PRIVACY_POLICY_URL` | Privacy Policy page – same places (dummy URL, replace it) |
{{#if API_ENCRYPTION}}
| `API_ENCRYPTION_ENABLED` | `true` (default) encrypts requests/decrypts responses; `false` sends plain JSON |
| `API_ENCRYPTION_KEY` | AES-256 key, exactly 32 characters – must match the backend |
| `API_ENCRYPTION_IV` | AES IV, exactly 16 characters – must match the backend |
{{/if}}
{{#if SOCIAL_GOOGLE}}
| `GOOGLE_WEB_CLIENT_ID` | Google OAuth **web** client ID (ID token audience) – see [docs/SOCIAL_LOGIN.md](docs/SOCIAL_LOGIN.md) |
| `GOOGLE_IOS_CLIENT_ID` | Google OAuth **iOS** client ID |
{{/if}}

Read values through `{{PATH_CONFIG_ENV}}` – never import `@env` elsewhere.
After changing `.env` restart Metro with `npm start -- --reset-cache`. Never commit `.env`.

## Navigation

```
{{#if DRAWER}}
Splash ──► Auth (Login) ──► Main ─┬─ Drawer (side menu) ──► Tabs (bottom tab bar): Home · …
{{else}}
Splash ──► Auth (Login) ──► Main ─┬─ Tabs (bottom tab bar): Home · …
{{/if}}
                                  ├─ Settings{{#if NOTIFICATIONS}} · Notifications{{/if}} · EditProfile
                                  └─ WebView (pushed, native header + back button)
```

- `{{PATH_NAVIGATION_APP}}` – root stack + `NavigationContainer` (themed via `{{PATH_NAVIGATION_THEME}}`)
- `{{PATH_NAVIGATION_AUTH}}` / `{{PATH_NAVIGATION_MAIN}}` – nested stacks
{{#if DRAWER}}
- `{{PATH_NAVIGATION_DRAWER}}` – side drawer around the bottom tabs (swipe from the edge or tap ☰). Its menu
  (user card, Notifications, Settings, Log out) is `{{PATH_NAVIGATION_DRAWERCONTENT}}`.
{{/if}}
- `{{PATH_NAVIGATION_TABS}}` – the bottom tab bar shown after login.
- `{{PATH_NAVIGATION_HOMESTACK}}` – the Home tab is a **native stack**, so Home uses the platform's native
  header (UINavigationBar / Android toolbar) – no custom header component.{{#if DRAWER}} Left: drawer button.{{/if}}{{#if NOTIFICATIONS}} Right: notification bell with the unread count.{{/if}}
{{#if HAS_HEADER_BUTTONS}}
- `{{PATH_NAVIGATION_HEADERBUTTONS}}` – `HeaderIconButton` and the ready-made header buttons. Use them in
  `headerLeft` / `headerRight` of any screen.
{{/if}}
- `{{PATH_NAVIGATION_TYPES}}` – typed params for every route
- `{{PATH_NAVIGATION_REF}}` – navigate from outside React (notifications, interceptors)
- Headers are React Navigation's own headers. Their colours and fonts come from the app theme, so they
  follow light / dark mode. Set a title with `options={{ title }}` or `navigation.setOptions({ title })`.

## State management

**{{STATE_MANAGEMENT_NAME}}**. Screens never talk to the store directly – they use
`{{PATH_HOOKS_USEAUTHSESSION}}` (`user`, `signIn`, `signOut`, `restore`), so the implementation can change
without touching UI code.
{{#if STATE_REDUX}}

Store: `{{DIR_STORE}}` (`index.ts`, `rootReducer.ts`, `slices/`, `selectors/`, typed `useAppDispatch`/`useAppSelector`).
{{/if}}
{{#if STATE_ZUSTAND}}

Store: `{{DIR_STORE}}/authStore.ts`. Add new stores next to it and re-export them from `index.ts`.
{{/if}}
{{#if STATE_CONTEXT}}

Provider: `{{DIR_STORE}}/AuthContext.tsx`, mounted in `AppProviders`.
{{/if}}

## Localization (i18n)

Every JSON file in `{{DIR_I18N}}/locales/<language>/` is a namespace named after the file:

```text
{{DIR_I18N}}/locales/
├── en/ common.json auth.json home.json product.json order.json
{{#if RTL}}
├── hi/ common.json auth.json home.json product.json order.json
└── ar/ common.json auth.json home.json product.json order.json   (right-to-left)
{{else}}
└── hi/ common.json auth.json home.json product.json order.json
{{/if}}
```

Text is **only** rendered through `AppText`. `intlType` is the JSON file, `value` is the key inside it.
Once the file is set, `value` autocompletes that file's keys, and a typo is a compile error. Dynamic parts
go in `value1`, `value2`, `value3`:

```jsonc
// locales/en/home.json
{ "pickImage": "Pick an image", "imageSelected": "Image selected ({{value1}}×{{value2}})" }
```

```tsx
<AppText intlType="home" value="pickImage" />                                 // Pick an image
<AppText intlType="auth" value="login" />                                     // Login
<AppText intlType="home" value="welcomeUser" value1="Jane" />                 // Hello, Jane 👋
<AppText intlType="home" value="imageSelected" value1={600} value2={400} />   // Image selected (600×400)
<AppText intlType="product" value="productCount" count={3} />                 // plurals: productCount_one / _other
```

- In the JSON, use `{{value1}}`, `{{value2}}`, `{{value3}}` (and `{{count}}` for plurals). Keys are flat
  and only need to be unique inside their own file.
- `AppButton` takes the same `intlType` + `value`. `AppInput` takes `intlType` + `labelValue` /
  `placeholderValue` / `errorValue`, `AppHeader` takes `intlType` + `titleValue` / `rightValue`, and flash
  messages use `flash.success({ intlType: 'home', value: 'notificationsEnabled' })`.
- Outside JSX (navigation titles, alerts): `translate('home', 'welcomeUser', { value1: 'Jane' })`.
- Switch language: `useLanguage().changeLanguage('hi')` (persisted; device language is used by default).
- **Add a file** (e.g. `cart.json`): create it for every language and register it in `{{PATH_I18N_RESOURCES}}`.
- **Add a language:** add it to `{{PATH_I18N_LANGUAGES}}`, copy `locales/en` and register it in `resources.ts`.
- `npm test` fails if a key is nested or missing in a language.
{{#if RTL}}

### Right-to-left (RTL)

Arabic (`ar`) is included as the sample RTL language. A language is RTL when it has `rtl: true` in
`{{PATH_I18N_LANGUAGES}}`.

- RTL is native. When the new language has a different direction than the running app,
  `{{PATH_I18N_DIRECTION}}` persists it with `I18nManager.forceRTL` and restarts the app once
  (`react-native-restart`). After that the whole app is mirrored: rows, text alignment, the stack header,
  the tab bar and swipe-back gestures. Switching between two languages with the same direction needs no restart.
- The same check runs at startup, so an app installed on an Arabic device starts right-to-left.
- `useDirection()` returns `{ direction, isRTL }`. Use it to flip directional icons, as `AppHeader` does for
  its back arrow.
- Text: `AppText` and `AppInput` align to the start (right in RTL). For `Text`, React Native mirrors
  `textAlign: 'left'` but not the default `'auto'`, so `AppText` sets `'left'`. For `TextInput` it's the
  opposite: leave `textAlign` unset and set `writingDirection`, as `AppInput` does.
- Write styles with `start`/`end` instead of `left`/`right` (`marginStart`, `paddingEnd`, `start: 0`).
  `flexDirection: 'row'` mirrors automatically.
{{/if}}

## Adding screens

1. Create the screen in `{{DIR_SCREENS}}` (or the folder your architecture uses – see docs/ARCHITECTURE.md),
   built from `AppScreen`, `AppText`, `AppButton`…
2. Add its params to `{{PATH_NAVIGATION_TYPES}}`.
3. Register it in `{{PATH_NAVIGATION_MAIN}}` (signed-in) or `{{PATH_NAVIGATION_AUTH}}` (signed-out).
4. Put its texts in a JSON file under `locales/` for every language.
5. Navigate: `navigation.navigate('Main', { screen: 'MyScreen' })`.

## Services

| Service | Location | Notes |
| --- | --- | --- |
| API | `{{DIR_API}}` | `apiClient` (Axios) with auth header, 401 → refresh once → `onUnauthorized`, errors normalised to `ApiError`. Use `api.get/post/...`. Configure refresh with `configureApiAuth({ refreshAccessToken })`. |
{{#if API_ENCRYPTION}}
| API encryption | `{{PATH_API_ENCRYPTION}}` | AES-256-CBC via crypto-js. Request bodies are sent as `{ "data": "<cipher>" }` and responses (including errors) are decrypted in the interceptors. Opt out per request with `{ skipEncryption: true }`. Change `toEncryptedBody`/`fromEncryptedBody` to match your backend's format. |
{{/if}}
| Storage | `{{DIR_STORAGE}}` | `storageService.set/get/remove/clear` ({{#if STORAGE_MMKV}}MMKV{{else}}AsyncStorage{{/if}}), JSON serialised, adapter replaceable (`setStorageAdapter`). Keys in `storageKeys.ts`. |
| Permissions | `{{PATH_PERMISSIONS_SERVICE}}` | `permissionService.ensure('camera')`, notification helpers, `openSettings()`. |
| Image picker | `{{PATH_MEDIA_IMAGEPICKER}}` | `imagePicker.pickFromGallery/pickFromCamera({ maxWidth, maxHeight, quality })` (react-native-image-picker) – usable anywhere; React wrapper `useImagePicker`. |
| Flash messages | `{{PATH_UTILS_FLASHMESSAGE}}` | `flash.success({ intlType: 'home', value: 'notificationsEnabled' })`, `flash.error({ message })`. |
| Firebase | `{{PATH_FIREBASE_SERVICE}}` | `isFirebaseConfigured()` – every Firebase call is guarded by it. |
{{#if ANALYTICS}}
| Analytics | `{{PATH_FIREBASE_ANALYTICS}}` | `analyticsService.logEvent/logScreen` (screens are tracked automatically in AppNavigator). |
{{/if}}
| WebView | `{{PATH_COMPONENTS_APPWEBVIEW}}` | `AppWebView` component + `WebView` route. |
{{#if VECTOR_ICONS}}
| Icons | `{{PATH_COMPONENTS_APPICON}}` | The only file importing the icon library. `MaterialDesignIcons.ttf` is registered in Info.plist › `UIAppFonts` (iOS); Android bundles it automatically. Using another icon set? Add its package and its `.ttf` to `UIAppFonts`. |
{{/if}}
| Theme | `{{DIR_THEME}}` | `lightColors`/`darkColors`, `typography` (GolosText font families + sizes), `spacing`, `borderRadius`, `shadows`, `flexs`, `opacity`. Read them through `useTheme()` / `useStyles(createStyles)` – never hard-code values. |

## Theme & fonts

The theme lives in `{{DIR_THEME}}` and is always read through `{{PATH_HOOKS_USETHEME}}`:

```tsx
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    title: {
      fontFamily: theme.typography.fontFamily.semiBold, // weight = font family, never fontWeight
      fontSize: theme.typography.fontSize.size16,
      color: theme.colors.primary, // semantic colour – follows light / dark mode
      padding: theme.spacing.spacing16,
    },
  });

const styles = useStyles(createStyles);
<AppText fontFamily="bold" fontSize="size24" color="primary" intlType="home" value="home" />
```

**Colours.** Use the semantic colours in components – `primary`, `onPrimary`, `background`, `surface`,
`text`, `textSecondary`, `border`, `error`… They have a light and a dark value in `colors.ts`, so every
screen works in both themes. The brand palette (`primaryBlue`, `titleGray`…) stays available but does not
change with the theme.

**Fonts.** GolosText (Regular, Medium, SemiBold, Bold, ExtraBold, Black) lives in `{{DIR_ASSETS}}/fonts`.
It is linked to Android (`android/app/src/main/assets/fonts`) and iOS (app target resources + Info.plist
› `UIAppFonts`). To add or replace fonts, put them in that folder, update `typography.fontFamily` and run
`npx react-native-asset` (configured in `react-native.config.js`).

{{#if THEME_CONTEXT}}
**Light / dark mode.** `ThemeProvider` (`{{PATH_APP_THEMECONTEXT}}`) is mounted in `AppProviders`:

```tsx
const { theme, isDark, themeMode, setThemeMode, toggleTheme } = useTheme();
setThemeMode('dark'); // 'light' | 'dark' | 'system' – persisted
```

Screens, headers, the tab bar and the status bar all switch with it. Adjust the dark values in `darkColors` (`colors.ts`).
{{else}}
This project was generated without a theme context: `useTheme()` always returns `lightTheme`. To add dark
mode later, replace `useTheme` in `{{PATH_HOOKS_USETHEME}}` with a context (`darkTheme` already exists).
{{/if}}

## Scripts

| Script | Description |
| --- | --- |
| `npm start` | Metro bundler |
| `npm run android` / `npm run ios` | Build & run |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (write) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest |

## Building a production APK/AAB

1. Generate an upload key:
   `keytool -genkeypair -v -storetype PKCS12 -keystore android/app/upload.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000`
2. Add the credentials to `~/.gradle/gradle.properties` (never commit them):
   ```properties
   MYAPP_UPLOAD_STORE_FILE=upload.keystore
   MYAPP_UPLOAD_KEY_ALIAS=upload
   MYAPP_UPLOAD_STORE_PASSWORD=*****
   MYAPP_UPLOAD_KEY_PASSWORD=*****
   ```
3. Add a `release` signing config in `android/app/build.gradle` that reads these properties
   (https://reactnative.dev/docs/signed-apk-android).
4. Build:
   ```bash
   cd android
   ./gradlew bundleRelease     # AAB for Play Store → app/build/outputs/bundle/release/
   ./gradlew assembleRelease   # APK → app/build/outputs/apk/release/
   ```

## Building iOS

1. Open `ios/{{APP_NAME}}.xcworkspace` in Xcode.
2. Select your team under *Signing & Capabilities*; add **Push Notifications** and
   **Background Modes → Remote notifications** (see firebase/README.md).
3. Set the scheme to *Release*, choose *Any iOS Device*, then *Product → Archive*.
4. Distribute through the Organizer (TestFlight / App Store).
