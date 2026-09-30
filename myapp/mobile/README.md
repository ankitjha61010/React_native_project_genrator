# myapp

React Native 0.87.1 + TypeScript app generated with **rn-architecture-generator**.

- **Architecture:** Layered Architecture – Presentation → Business → Data, with Infrastructure for platform services.
- **State management:** Redux Toolkit
- **Android package / iOS bundle id:** `com.myapp`

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deep dive into the architecture.

---

## Table of contents

0. [Where is what](#where-is-what)
1. [Dependencies](#dependencies)
2. [Folder structure](#folder-structure)
3. [Installation](#installation)
4. [Running Android](#running-android)
5. [Running iOS](#running-ios)
6. [Firebase setup](#firebase-setup)
7. [Notification setup](#notification-setup)
   - [Social login](#social-login)
   - [Google Location SDK](#google-location-sdk)
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

## Where is what

Every feature follows the same path: **Screen** (UI only) → **hook** (screen state + logic) → **API file**
(requests only) → backend endpoint.

| Feature | Screen | Hook | API | Backend |
| --- | --- | --- | --- | --- |
| Login | `src/presentation/screens/LoginScreen/LoginScreen.tsx` | `src/presentation/hooks/useLogin.ts` | `src/data/api/authApi.ts` | `POST /auth/login` |
| Profile / edit profile | `src/presentation/screens/ProfileScreen/ProfileScreen.tsx` · `src/presentation/screens/EditProfileScreen/EditProfileScreen.tsx` | `src/presentation/hooks/useProfile.ts` | `src/data/api/userApi.ts` | `PATCH /users/me`, `POST /users/me/avatar` |
| Change password | `src/presentation/screens/ChangePasswordScreen/ChangePasswordScreen.tsx` | `src/presentation/hooks/useChangePassword.ts` | `src/data/api/authApi.ts` | `POST /auth/change-password` |
| Delete account | `src/presentation/screens/ProfileScreen/ProfileScreen.tsx` | `src/presentation/hooks/useProfile.ts` | `src/data/api/userApi.ts` | `DELETE /users/me` |
| Terms & Conditions | `src/presentation/components/LegalLinks/LegalLinks.tsx` | `useLegalPages` (same file) | `src/data/api/legalApi.ts` | `GET /legal` |
| Device (FCM token) | – | `src/data/api/authApi.ts` | `src/infrastructure/notification/deviceInfo.ts` · `src/data/api/deviceApi.ts` | `device` in the sign-in / refresh bodies, `deviceId` in `POST /auth/logout`, `PATCH /devices/:deviceId` (rotated token) |
| Chat list | `src/features/chat/screens/ChatListScreen/ChatListScreen.tsx` | `src/features/chat/hooks/useChatList.ts` | `src/features/chat/services/chatService.ts` | `/chat/conversations` |
| Chat room (typing, online, files, voice) | `src/features/chat/screens/ChatRoomScreen/ChatRoomScreen.tsx` | `src/features/chat/hooks/useChatRoom.ts` | `src/features/chat/services/chatService.ts` · `src/features/chat/services/voiceService.ts` | `/chat/conversations/:id/messages`, `/chat/upload` |
| New chat (user list) | `src/features/chat/screens/NewChatScreen/NewChatScreen.tsx` | `src/features/chat/hooks/useUserList.ts` | `src/data/api/userApi.ts` | `GET /users/search` |
| Groups | `src/features/chat/screens/CreateGroupScreen/CreateGroupScreen.tsx` · `src/features/chat/screens/GroupInfoScreen/GroupInfoScreen.tsx` | `src/features/chat/hooks/useCreateGroup.ts` · `src/features/chat/hooks/useGroupInfo.ts` | `src/features/chat/services/groupService.ts` | `/chat/groups…` |

Realtime (Socket.IO): `src/services/socket/socketService.ts` (one connection while signed in – it disconnects in the
background, so others see you offline) and the event names in `src/services/socket/socketEvents.ts`.
Session state: `src/presentation/hooks/useAuthSession.ts` (`user`, `signIn`, `updateUser`, `signOut`) with its side effects in `src/data/api/sessionService.ts`.
Layout direction (RTL / LTR): `src/infrastructure/i18n/direction.ts`.

## Dependencies

| Area | Packages |
| --- | --- |
| Navigation | `@react-navigation/native`, `native-stack`, `bottom-tabs`, `drawer`, `react-native-screens`, `react-native-safe-area-context` |
| Gestures & animation | `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets` |
| Firebase & notifications | `@react-native-firebase/app`, `messaging`, `analytics`, `@notifee/react-native` |
| Networking | `axios` (single client with interceptors) |
| API encryption | `crypto-js` (AES-256-CBC request/response encryption) |
| Storage | `react-native-mmkv` + `react-native-nitro-modules` (behind a replaceable adapter) |
| Forms | `react-hook-form`, `zod`, `@hookform/resolvers` |
| Location | `react-native-geolocation-service` (Google Fused Location Provider on Android, CoreLocation on iOS); Places / Geocoding over HTTPS |
| i18n | `i18next`, `react-i18next`, `react-native-localize` |
| UI | `react-native-flash-message`, `@react-native-vector-icons/material-design-icons`, `react-native-webview` |
| Media & permissions | `react-native-image-picker`, `react-native-permissions`, `@react-native-community/image-editor` (crop), `@shopify/react-native-skia` + `react-native-file-access` (photo filters) |
| Social login | `@react-native-google-signin/google-signin` `react-native-fbsdk-next` `@invertase/react-native-apple-authentication` |
| State | `@reduxjs/toolkit`, `react-redux` |
| Tooling | TypeScript, ESLint, Prettier, Jest, `react-native-dotenv`, `babel-plugin-module-resolver`, `@babel/plugin-transform-export-namespace-from` (needed by zod v4) |

Every version is pinned and was verified against React Native 0.87.1. Upgrade them together
(`npx react-native upgrade` + the libraries' changelogs) rather than one by one.


## Folder structure

```text
src/
├── assets/
│   ├── flags/
│   └── fonts/
├── business/
│   ├── models/
│   ├── services/
│   ├── state/
│   │   ├── selectors/
│   │   └── slices/
│   └── validation/
├── data/
│   ├── api/
│   ├── repositories/
│   └── storage/
├── features/
│   ├── auth/
│   │   ├── screens/
│   │   │   ├── ForgotPasswordScreen/
│   │   │   ├── RegisterScreen/
│   │   │   └── ResetPasswordScreen/
│   │   └── services/
│   └── chat/
│       ├── components/
│       │   ├── AudioMessage/
│       │   ├── ChatActions/
│       │   ├── ChatBubble/
│       │   ├── ChatInputBar/
│       │   ├── ChatMediaPreview/
│       │   ├── ChatNotice/
│       │   ├── TypingIndicator/
│       │   └── UserRow/
│       ├── hooks/
│       ├── screens/
│       │   ├── ChatDetailsScreen/
│       │   ├── ChatListScreen/
│       │   ├── ChatRoomScreen/
│       │   ├── CreateGroupScreen/
│       │   ├── GroupInfoScreen/
│       │   └── NewChatScreen/
│       ├── services/
│       ├── types/
│       └── utils/
├── infrastructure/
│   ├── config/
│   ├── firebase/
│   ├── i18n/
│   │   └── locales/
│   │       ├── ar/
│   │       ├── en/
│   │       └── hi/
│   ├── location/
│   ├── media/
│   ├── notification/
│   └── permissions/
├── presentation/
│   ├── app/
│   ├── components/
│   │   ├── AppButton/
│   │   ├── AppHeader/
│   │   ├── AppIcon/
│   │   ├── AppInput/
│   │   ├── AppLoader/
│   │   ├── AppScreen/
│   │   ├── AppText/
│   │   ├── AppWebView/
│   │   ├── CountryPicker/
│   │   ├── FadeInView/
│   │   ├── LanguageSwitcher/
│   │   ├── LegalLinks/
│   │   ├── LocationPicker/
│   │   ├── LoginForm/
│   │   ├── MediaEditorModal/
│   │   ├── MediaPickerModal/
│   │   └── PhoneInput/
│   ├── hooks/
│   ├── navigation/
│   ├── screens/
│   │   ├── ChangePasswordScreen/
│   │   ├── EditProfileScreen/
│   │   ├── HomeScreen/
│   │   ├── LoginScreen/
│   │   ├── NotificationsScreen/
│   │   ├── ProfileScreen/
│   │   ├── SettingsScreen/
│   │   ├── SplashScreen/
│   │   └── WebViewScreen/
│   └── theme/
├── services/
│   └── socket/
├── types/
└── utils/
```

Every folder in `src/` has its own `@` alias, so files can move without `../../..` chains. The aliases
are configured in `babel.config.js` and `tsconfig.json` (keep the two in sync):

| Alias | Folder |
| --- | --- |
| `@assets/…` | `src/assets/…` |
| `@business/…` | `src/business/…` |
| `@data/…` | `src/data/…` |
| `@features/…` | `src/features/…` |
| `@infrastructure/…` | `src/infrastructure/…` |
| `@presentation/…` | `src/presentation/…` |
| `@services/…` | `src/services/…` |
| `@typings/…` | `src/types/…` |
| `@utils/…` | `src/utils/…` |

```ts
import { AppText } from '@presentation/components/AppText';
import { useTheme } from '@presentation/hooks/useTheme';
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

The project runs **without** Firebase – analytics and push are simply disabled and a warning is logged.
To enable them follow [firebase/README.md](firebase/README.md):

1. Create a Firebase project.
2. Download `google-services.json` → `android/app/google-services.json`.
3. Download `GoogleService-Info.plist` → add it to the `myapp` target in Xcode.
4. Configure Firebase Messaging (APNs key for iOS).

Nothing in this repository contains real Firebase credentials.

## Notification setup

Code lives in `src/infrastructure/notification`:

| File | Responsibility |
| --- | --- |
| `notificationPermissions.ts` | Ask/check permission (iOS + Android 13 `POST_NOTIFICATIONS`) |
| `notificationToken.ts` | Get / refresh the FCM token |
| `deviceInfo.ts` | This install: id (created once), type, model, OS / app version, FCM token → the `device` of every sign-in (`getSignInDevice`); `syncFcmToken` sends a rotated token |
| `notificationDisplay.ts` | `displayNotification(message)` – shows an FCM message with Notifee (Android channel `default`) |
| `notificationHandlers.ts` | `registerNotificationHandlers()` (called in `index.js`) and tap handling |
| `notificationService.ts` | `notificationService.initialize()` – permission, token refresh, tap listeners |

**Devices.** A user can be signed in on several devices; each one is a row on the backend. There is **no separate
device request**: login, register, OTP, social sign-in and token refresh send `device` (`deviceId`, `deviceType`,
`deviceModel`, `osVersion`, `appVersion`, `fcmToken`) and the backend saves it while signing in; logout sends
`deviceId` and the backend removes it. The only device call is `PATCH /devices/:deviceId` when FCM rotates the token
(or iOS only gets one after notifications are allowed).

**Entry point (`index.js`)**: `registerNotificationHandlers()` runs before the app renders and registers:

| Handler | When | What happens |
| --- | --- | --- |
| `onMessage` | App in the foreground | The OS shows nothing, so `displayNotification` shows it with Notifee |
| `setBackgroundMessageHandler` | App in the background / killed | Notification messages are shown by the OS; data-only messages (`data.title` / `data.body`) are shown with Notifee |
| `notifee.onBackgroundEvent` | Notifee notification pressed in the background | The press is stored and replayed when the app opens |

`useSessionServices` (mounted by `MainNavigator`) initialises notifications after login and opens `data.url`
in the in-app WebView when a notification is tapped. Taps are reported whether FCM or Notifee showed the
notification and whatever state the app was in.

### Notification types and taps

**Every notification type is defined in one file: `src/infrastructure/notification/notificationTypes.ts`.** Change or add types there; the
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
| `chat` | The conversation (`ChatRoom` with `data.conversationId`); the Notifications screen if the id is missing |
| `order`, `promotion`, `account`, `general`, unknown or missing | The **Notifications** screen, with the tapped item highlighted |

Every received notification is stored in the inbox (`src/infrastructure/notification/notificationInbox.ts`, newest first, max 100) and listed on
the Notifications screen with an unread badge in the Home header. Tapping a row opens its target;
if it has none, a `data.url` opens in the in-app browser. Signing out clears the inbox.
If your backend keeps the notification history, load it in `notificationInbox.reload()`.

| File | Responsibility |
| --- | --- |
| `src/infrastructure/notification/notificationTypes.ts` | **Types, labels, icons and where a tap goes** |
| `src/infrastructure/notification/notificationRouter.ts` | `handleNotificationTap` (push taps) and `openNotification` (inbox rows) |
| `src/infrastructure/notification/notificationInbox.ts` | Stored list + read state; `src/infrastructure/notification/useNotifications.ts` is its React hook |
| `src/presentation/screens/NotificationsScreen/NotificationsScreen.tsx` | The Notifications screen |

Test with the Firebase console → *Messaging* → *Send test message* using the token printed in Metro
(add `type` / `conversationId` under *Additional options → Custom data*).

## Social login

The login screen offers **Google**, **Facebook** and **Apple** (iOS only).
The code and all native setup are done, but **every key is a `YOUR_…` placeholder**. Replace them before you test.

| Where | What to replace |
| --- | --- |
| `.env` | `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID` |
| `ios/myapp/Info.plist` | Google: reversed iOS client ID URL scheme |
| `ios/myapp/Info.plist` | Facebook: `FacebookAppID`, `FacebookClientToken`, `fb<APP_ID>` URL scheme |
| `android/app/src/main/res/values/strings.xml` | Facebook: `facebook_app_id`, `facebook_client_token`, `fb_login_protocol_scheme` |
| Apple Developer portal / Xcode | Enable *Sign in with Apple* for `com.myapp` (entitlement already added) |

Step-by-step guide (consoles, SHA-1 and key hashes, backend token verification): [docs/SOCIAL_LOGIN.md](docs/SOCIAL_LOGIN.md).

## Google Location SDK

The profile's **Location** field (`src/presentation/components/LocationPicker/LocationPicker.tsx`) suggests cities from Google Places while
typing and has **Use current location** (device position → "City, Country").

| File | What |
| --- | --- |
| `src/infrastructure/location/locationService.ts` | Permission flow (`permissionService` → `location`), `getCurrentPosition()`, `watchPosition()` (returns a stop function), typed `LocationError`s |
| `src/infrastructure/location/placesService.ts` | Google Places API (New) autocomplete + Geocoding API reverse geocoding, typed `PlacesError`s |
| `src/infrastructure/location/useLocationSearch.ts` | Debounced search, pick a suggestion, current location – UI-free |

Setup:

1. Google Cloud Console → APIs & Services → enable **Places API (New)** and **Geocoding API**.
2. Create an API key (restrict it to your Android package / iOS bundle id and those two APIs) and set
   `GOOGLE_MAPS_API_KEY` in `.env`, then restart Metro with `--reset-cache`.
3. Already configured by the generator: `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` (AndroidManifest.xml),
   `NSLocationWhenInUseUsageDescription` (Info.plist) and `LocationWhenInUse` in the Podfile's `setup_permissions`.
   Android needs Google Play Services on the device (emulators: use a "Google APIs" image).

## Environment variables

`.env` is loaded at build time through `react-native-dotenv` and typed in `src/types/env.d.ts`.

| Variable | Description |
| --- | --- |
| `API_BASE_URL` | Base URL used by the Axios client |
| `APP_ENV` | `development` \| `staging` \| `production` |
| `API_ENCRYPTION_ENABLED` | `true` (default) encrypts requests/decrypts responses; `false` sends plain JSON |
| `API_ENCRYPTION_KEY` | AES-256 key, exactly 32 characters – must match the backend |
| `API_ENCRYPTION_IV` | AES IV, exactly 16 characters – must match the backend |
| `GOOGLE_WEB_CLIENT_ID` | Google OAuth **web** client ID (ID token audience) – see [docs/SOCIAL_LOGIN.md](docs/SOCIAL_LOGIN.md) |
| `GOOGLE_IOS_CLIENT_ID` | Google OAuth **iOS** client ID |
| `GOOGLE_MAPS_API_KEY` | Google Places API (New) + Geocoding API key – see [Google Location SDK](#google-location-sdk) |

Read values through `src/infrastructure/config/env.ts` – never import `@env` elsewhere.
After changing `.env` restart Metro with `npm start -- --reset-cache`. Never commit `.env`.

## Navigation

```
Splash ──► Auth (Login) ──► Main ─┬─ Drawer (side menu) ──► Tabs (bottom tab bar): Home · …
                                  ├─ Settings · Notifications · EditProfile
                                  └─ WebView (pushed, native header + back button)
```

- `src/presentation/navigation/AppNavigator.tsx` – root stack + `NavigationContainer` (themed via `src/presentation/navigation/navigationTheme.ts`)
- `src/presentation/navigation/AuthNavigator.tsx` / `src/presentation/navigation/MainNavigator.tsx` – nested stacks
- `src/presentation/navigation/DrawerNavigator.tsx` – side drawer around the bottom tabs (swipe from the edge or tap ☰). Its menu
  (user card, Notifications, Settings, Log out) is `src/presentation/navigation/DrawerContent.tsx`.
- `src/presentation/navigation/BottomTabNavigator.tsx` – the bottom tab bar shown after login.
- `src/presentation/navigation/HomeStackNavigator.tsx` – the Home tab is a **native stack**, so Home uses the platform's native
  header (UINavigationBar / Android toolbar) – no custom header component. Left: drawer button. Right: notification bell with the unread count.
- `src/presentation/navigation/HeaderButtons.tsx` – `HeaderIconButton` and the ready-made header buttons. Use them in
  `headerLeft` / `headerRight` of any screen – always as an element (`headerRight: () => <MyButton />`, or the
  `renderDrawerButton` / `renderNotificationBell` helpers), never `headerRight: MyButton`: React Navigation calls
  these options as plain functions, so a component with hooks passed directly causes "Invalid hook call".
- `src/presentation/navigation/navigationTypes.ts` – typed params for every route
- `src/presentation/navigation/navigationRef.ts` – navigate from outside React (notifications, interceptors)
- Headers are React Navigation's own headers. Their colours and fonts come from the app theme, so they
  follow light / dark mode. Set a title with `options={{ title }}` or `navigation.setOptions({ title })`.

## State management

**Redux Toolkit**. Screens never talk to the store directly – they use
`src/presentation/hooks/useAuthSession.ts` (`user`, `signIn`, `signOut`, `restore`), so the implementation can change
without touching UI code.

Store: `src/business/state` (`index.ts`, `rootReducer.ts`, `slices/`, `selectors/`, typed `useAppDispatch`/`useAppSelector`).

## Localization (i18n)

Every JSON file in `src/infrastructure/i18n/locales/<language>/` is a namespace named after the file:

```text
src/infrastructure/i18n/locales/
├── en/ common.json auth.json home.json product.json order.json
├── hi/ common.json auth.json home.json product.json order.json
└── ar/ common.json auth.json home.json product.json order.json   (right-to-left)
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
- **Add a file** (e.g. `cart.json`): create it for every language and register it in `src/infrastructure/i18n/resources.ts`.
- **Add a language:** add it to `src/infrastructure/i18n/languages.ts`, copy `locales/en` and register it in `resources.ts`.
- `npm test` fails if a key is nested or missing in a language.

### Right-to-left (RTL)

Arabic (`ar`) is included as the sample RTL language. A language is RTL when it has `rtl: true` in
`src/infrastructure/i18n/languages.ts`.

- **One place decides the direction:** `src/infrastructure/i18n/direction.ts`. The saved language → its direction →
  the whole UI, **immediately** – switching LTR ⇄ RTL never restarts the app. Nothing is flipped screen by screen.
- Why not `I18nManager` alone: React Native reads the native direction once at startup and keeps returning it
  until the app restarts. So the direction is kept in JS: the root view gets `direction` (Yoga mirrors every row,
  `start` / `end` margin, padding and position below it) and `applyLayoutDirection()` notifies `useDirection()`.
  The native flags are still written on every start and change, for the next cold start and system UI.
- `NavigationContainer` gets the live direction, so native headers (back arrow), the drawer (it opens from the
  start side) and swipe-back gestures follow the app's direction – never the device locale.
- `useDirection()` returns `{ direction, isRTL, directionStyle, backIcon, forwardIcon, backArrow }` and re-renders
  on a switch – use these icon names for anything that points "back" or "forward" (AppHeader, chat header,
  profile rows do). A `<Modal>` is its own native root: put `directionStyle` on its first view.
- Text: `AppText` and `AppInput` align to the start (right in RTL). For `Text`, React Native mirrors
  `textAlign: 'left'` but not the default `'auto'`, so `AppText` sets `'left'`. For `TextInput` it's the
  opposite: leave `textAlign` unset and set `writingDirection`, as `AppInput` does.
- Write styles with `start` / `end` instead of `left` / `right` (`marginStart`, `paddingEnd`, `end: 0`,
  `borderBottomStartRadius`). `flexDirection: 'row'` mirrors automatically.

## Adding screens

1. Create the screen in `src/presentation/screens` (or the folder your architecture uses – see docs/ARCHITECTURE.md),
   built from `AppScreen`, `AppText`, `AppButton`…
2. Add its params to `src/presentation/navigation/navigationTypes.ts`.
3. Register it in `src/presentation/navigation/MainNavigator.tsx` (signed-in) or `src/presentation/navigation/AuthNavigator.tsx` (signed-out).
4. Put its texts in a JSON file under `locales/` for every language.
5. Navigate: `navigation.navigate('Main', { screen: 'MyScreen' })`.

## Services

| Service | Location | Notes |
| --- | --- | --- |
| API | `src/data/api` | `apiClient` (Axios) with auth header, 401 → refresh once → `onUnauthorized`, errors normalised to `ApiError`. One file per backend area: `authApi` (sign-in, sessions, change password), `userApi` (profile, avatar, delete account, people to chat with), `deviceApi`, `legalApi` (Terms / Privacy links from the backend). |
| Errors | `src/data/api/apiErrors.ts` | `errorMessage(error)` – a readable, translated message for any failed request (400 / 401 / 403 / 404 / 409 / 422 / 5xx, offline, timeout, uploads). Never show raw errors. |
| Session | `src/data/api/sessionService.ts` | What sign-in / sign-out does besides the state (persist, revoke, clear device, disconnect the socket) – used by `useAuthSession` (`signIn`, `updateUser`, `signOut`). |
| API encryption | `src/data/api/apiEncryption.ts` | AES-256-CBC via crypto-js. Request bodies are sent as `{ "data": "<cipher>" }` and responses (including errors) are decrypted in the interceptors. Opt out per request with `{ skipEncryption: true }`. Change `toEncryptedBody`/`fromEncryptedBody` to match your backend's format. |
| Storage | `src/data/storage` | `storageService.set/get/remove/clear` (MMKV), JSON serialised, adapter replaceable (`setStorageAdapter`). Keys in `storageKeys.ts`. |
| Permissions | `src/infrastructure/permissions/permissionService.ts` | `permissionService.ensure('camera')`, notification helpers, `openSettings()`. |
| Image picker | `src/infrastructure/media/imagePicker.ts` | `imagePicker.pickFromGallery/pickFromCamera({ maxWidth, maxHeight, quality })` (react-native-image-picker) – usable anywhere; React wrapper `useImagePicker`. |
| Flash messages | `src/utils/flashMessage.ts` | `flash.success({ intlType: 'home', value: 'notificationsEnabled' })`, `flash.error({ message })`. |
| Firebase | `src/infrastructure/firebase/firebaseService.ts` | `isFirebaseConfigured()` – every Firebase call is guarded by it. |
| Analytics | `src/infrastructure/firebase/analyticsService.ts` | `analyticsService.logEvent/logScreen` (screens are tracked automatically in AppNavigator). |
| WebView | `src/presentation/components/AppWebView/AppWebView.tsx` | `AppWebView` component + `WebView` route. |
| Icons | `src/presentation/components/AppIcon/AppIcon.tsx` | The only file importing the icon library. `MaterialDesignIcons.ttf` is registered in Info.plist › `UIAppFonts` (iOS); Android bundles it automatically. Using another icon set? Add its package and its `.ttf` to `UIAppFonts`. |
| Theme | `src/presentation/theme` | `lightColors`/`darkColors`, `typography` (GolosText font families + sizes), `spacing`, `borderRadius`, `shadows`, `flexs`, `opacity`. Read them through `useTheme()` / `useStyles(createStyles)` – never hard-code values. |

## Theme & fonts

The theme lives in `src/presentation/theme` and is always read through `src/presentation/hooks/useTheme.ts`:

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

**Fonts.** GolosText (Regular, Medium, SemiBold, Bold, ExtraBold, Black) lives in `src/assets/fonts`.
It is linked to Android (`android/app/src/main/assets/fonts`) and iOS (app target resources + Info.plist
› `UIAppFonts`). To add or replace fonts, put them in that folder, update `typography.fontFamily` and run
`npx react-native-asset` (configured in `react-native.config.js`).

**Light / dark mode.** `ThemeProvider` (`src/presentation/app/ThemeContext.tsx`) is mounted in `AppProviders`:

```tsx
const { theme, isDark, themeMode, setThemeMode, toggleTheme } = useTheme();
setThemeMode('dark'); // 'light' | 'dark' | 'system' – persisted
```

Screens, headers, the tab bar and the status bar all switch with it. Adjust the dark values in `darkColors` (`colors.ts`).

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

1. Open `ios/myapp.xcworkspace` in Xcode.
2. Select your team under *Signing & Capabilities*; add **Push Notifications** and
   **Background Modes → Remote notifications** (see firebase/README.md).
3. Set the scheme to *Release*, choose *Any iOS Device*, then *Product → Archive*.
4. Distribute through the Organizer (TestFlight / App Store).
