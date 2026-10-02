# {{DISPLAY_NAME}}

React Native {{RN_VERSION}} + TypeScript app generated with **rn-architecture-generator**.

- **Architecture:** {{ARCHITECTURE_NAME}} – {{ARCHITECTURE_SUMMARY}}
- **State management:** {{STATE_MANAGEMENT_NAME}}
- **Android package / iOS bundle id:** `{{PACKAGE_NAME}}`

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
{{#if HAS_SOCIAL_AUTH}}
   - [Social login](#social-login)
{{/if}}
{{#if GOOGLE_LOCATION}}
   - [Google Location SDK](#google-location-sdk)
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

## Where is what

Every feature follows the same path: **Screen** (UI only) → **hook** (screen state + logic) → **API file**
(requests only) → backend endpoint.

| Feature | Screen | Hook | API | Backend |
| --- | --- | --- | --- | --- |
| Login | `{{PATH_SCREENS_LOGIN}}` | `{{PATH_AUTH_LOGIC}}` | `{{PATH_API_AUTH}}` | `POST /auth/login` |
| Profile / edit profile | `{{PATH_SCREENS_PROFILE}}` · `{{PATH_SCREENS_EDITPROFILE}}` | `{{PATH_HOOKS_USEPROFILE}}` | `{{PATH_API_USER}}` | `PATCH /users/me`, `POST /users/me/avatar` |
{{#if AUTH_EMAIL}}
| Change password | `{{PATH_SCREENS_CHANGEPASSWORD}}` | `{{PATH_HOOKS_USECHANGEPASSWORD}}` | `{{PATH_API_AUTH}}` | `POST /auth/change-password` |
{{/if}}
{{#if DELETE_ACCOUNT}}
| Delete account | `{{PATH_SCREENS_PROFILE}}` | `{{PATH_HOOKS_USEPROFILE}}` | `{{PATH_API_USER}}` | `DELETE /users/me` |
{{/if}}
{{#if TERMS}}
| Terms & Conditions | `{{PATH_COMPONENTS_LEGALLINKS}}` | `useLegalPages` (same file) | `{{PATH_API_LEGAL}}` | `GET /legal` |
{{/if}}
{{#if NOTIFICATIONS}}
| Device (FCM token) | – | `{{PATH_API_AUTH}}` | `{{PATH_NOTIFICATION_DEVICEINFO}}` · `{{PATH_API_DEVICE}}` | `device` in the sign-in / refresh bodies, `deviceId` in `POST /auth/logout`, `PATCH /devices/:deviceId` (rotated token) |
{{/if}}
{{#if CHAT}}
| Chat list | `{{PATH_CHAT_CHATLISTSCREEN}}` | `{{PATH_CHAT_USECHATLIST}}` | `{{PATH_CHAT_SERVICE}}` | `/chat/conversations` |
| Chat room (typing, online, files, voice) | `{{PATH_CHAT_CHATROOMSCREEN}}` | `{{PATH_CHAT_USECHATROOM}}` | `{{PATH_CHAT_SERVICE}}` · `{{PATH_CHAT_VOICESERVICE}}` | `/chat/conversations/:id/messages`, `/chat/upload` |
| New chat (user list) | `{{PATH_CHAT_NEWCHATSCREEN}}` | `{{PATH_CHAT_USEUSERLIST}}` | `{{PATH_API_USER}}` | `GET /users/search` |
{{#if GROUP_CHAT}}
| Groups | `{{PATH_CHAT_CREATEGROUPSCREEN}}` · `{{PATH_CHAT_GROUPINFOSCREEN}}` | `{{PATH_CHAT_USECREATEGROUP}}` · `{{PATH_CHAT_USEGROUPINFO}}` | `{{PATH_CHAT_GROUPSERVICE}}` | `/chat/groups…` |
{{/if}}
{{/if}}
{{#if SOCKET}}

Realtime (Socket.IO): `{{PATH_SOCKET_SERVICE}}` (one connection while signed in – it disconnects in the
background, so others see you offline) and the event names in `{{PATH_SOCKET_EVENTS}}`.
{{/if}}
Session state: `{{PATH_HOOKS_USEAUTHSESSION}}` (`user`, `signIn`, `updateUser`, `signOut`) with its side effects in `{{PATH_API_SESSION}}`.
{{#if RTL}}
Layout direction (RTL / LTR): `{{PATH_I18N_DIRECTION}}`.
{{/if}}

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
| Forms | `react-hook-form`, `zod`, `@hookform/resolvers` |
{{#if GOOGLE_LOCATION}}
| Location | `react-native-geolocation-service` (Google Fused Location Provider on Android, CoreLocation on iOS); Places / Geocoding over HTTPS |
{{/if}}
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

**Firebase + CocoaPods.** The Podfile is the standard React Native one (static libraries) with
`$RNFirebaseDisableSPM = true`, so the Firebase SDK comes from CocoaPods – Firebase's Swift packages
would require dynamic frameworks. The only addition is `:modular_headers => true` for the pods that
Firebase's Swift code imports as modules (`GoogleUtilities`, plus `RecaptchaInterop` with Google Sign-In).

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
{{#if PAYMENTS}}
## Payments

{{#if IAP}}In-app purchases ({{IAP_PROVIDER_NAME}}){{/if}}{{#if IAP}}{{#if GATEWAY}} and {{/if}}{{/if}}{{#if GATEWAY}}{{GATEWAY_NAME}} checkout{{/if}}: a Store screen (Profile → Premium) selling the
backend's catalog, and `useAccess().hasAccess('premium')` to unlock features. Store setup, test accounts and
the store rules: [docs/PAYMENTS.md](docs/PAYMENTS.md).
{{/if}}

{{#if GOOGLE_LOCATION}}
## Google Location SDK

The profile's **Location** field (`{{PATH_COMPONENTS_LOCATIONPICKER}}`) suggests cities from Google Places while
typing and has **Use current location** (device position → "City, Country").

| File | What |
| --- | --- |
| `{{PATH_LOCATION_SERVICE}}` | Permission flow (`permissionService` → `location`), `getCurrentPosition()`, `watchPosition()` (returns a stop function), typed `LocationError`s |
| `{{PATH_LOCATION_PLACES}}` | Google Places API (New) autocomplete + Geocoding API reverse geocoding, typed `PlacesError`s |
| `{{PATH_LOCATION_USELOCATIONSEARCH}}` | Debounced search, pick a suggestion, current location – UI-free |

Setup:

1. Google Cloud Console → APIs & Services → enable **Places API (New)** and **Geocoding API**.
2. Create an API key (restrict it to your Android package / iOS bundle id and those two APIs) and set
   `GOOGLE_MAPS_API_KEY` in `.env`, then restart Metro with `--reset-cache`.
3. Already configured by the generator: `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` (AndroidManifest.xml),
   `NSLocationWhenInUseUsageDescription` (Info.plist) and `LocationWhenInUse` in the Podfile's `setup_permissions`.
   Android needs Google Play Services on the device (emulators: use a "Google APIs" image).

{{/if}}
## Environment variables

`.env` is loaded at build time through `react-native-dotenv` and typed in `{{PATH_TYPES_ENV}}`.

| Variable | Description |
| --- | --- |
| `API_BASE_URL` | Base URL used by the Axios client |
| `APP_ENV` | `development` \| `staging` \| `production` |
{{#if API_ENCRYPTION}}
| `API_ENCRYPTION_ENABLED` | `true` (default) encrypts requests/decrypts responses; `false` sends plain JSON |
| `API_ENCRYPTION_KEY` | AES-256 key, exactly 32 characters – must match the backend |
| `API_ENCRYPTION_IV` | AES IV, exactly 16 characters – must match the backend |
{{/if}}
{{#if SOCIAL_GOOGLE}}
| `GOOGLE_WEB_CLIENT_ID` | Google OAuth **web** client ID (ID token audience) – see [docs/SOCIAL_LOGIN.md](docs/SOCIAL_LOGIN.md) |
| `GOOGLE_IOS_CLIENT_ID` | Google OAuth **iOS** client ID |
{{/if}}
{{#if GOOGLE_LOCATION}}
| `GOOGLE_MAPS_API_KEY` | Google Places API (New) + Geocoding API key – see [Google Location SDK](#google-location-sdk) |
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
  `headerLeft` / `headerRight` of any screen – always as an element (`headerRight: () => <MyButton />`, or the
  `renderDrawerButton` / `renderNotificationBell` helpers), never `headerRight: MyButton`: React Navigation calls
  these options as plain functions, so a component with hooks passed directly causes "Invalid hook call".
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

- **One place decides the direction:** `{{PATH_I18N_DIRECTION}}`. The saved language → its direction →
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
| API | `{{DIR_API}}` | `apiClient` (Axios) with auth header, 401 → refresh once → `onUnauthorized`, errors normalised to `ApiError`. One file per backend area: `authApi` (sign-in, sessions, change password), `userApi` (profile, avatar{{#if DELETE_ACCOUNT}}, delete account{{/if}}{{#if CHAT}}, people to chat with{{/if}}){{#if NOTIFICATIONS}}, `deviceApi`{{/if}}{{#if TERMS}}, `legalApi` (Terms / Privacy links from the backend){{/if}}. |
| Errors | `{{PATH_API_ERRORS}}` | `errorMessage(error)` – a readable, translated message for any failed request (400 / 401 / 403 / 404 / 409 / 422 / 5xx, offline, timeout, uploads). Never show raw errors. |
| Session | `{{PATH_API_SESSION}}` | What sign-in / sign-out does besides the state (persist, revoke, clear device{{#if SOCKET}}, disconnect the socket{{/if}}) – used by `useAuthSession` (`signIn`, `updateUser`, `signOut`). |
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
{{#if OTA}}
| `npm run ota:android` / `npm run ota:ios` | Signed OTA update archive (see [OTA updates](#over-the-air-ota-updates)) |
{{/if}}
| `npm test` | Jest |

{{#if OTA}}
## Over-The-Air (OTA) updates

JavaScript and image changes can be shipped without a store release. The app only installs
archives **signed with this project's key**: `ota/ota-signing-key.pem` was created when the
project was generated (git-ignored – keep a backup, without it you can't ship OTA updates to
installed apps).

Build an update (the OTA version must be higher than the one on the phone):

```sh
npm run ota:android -- --ota-version 2 --notes "Fixed the login screen"
npm run ota:ios -- --ota-version 2 --force        # --force: mandatory update
```

`ota-builds/<platform>-v<n>/` then contains `release.zip` and `release.json`. Host the zip
anywhere the phone can download it (pass `--base-url https://…` and the URL is filled in), then
**Admin panel → OTA Updates → New release** and paste `release.json`.

**Testing on your own phone** – serve the zip from this computer (same Wi-Fi):

```sh
npm run ota:android -- --ota-version 2 --serve    # prints http://<your-ip>:8099/release.zip
```

Install a **release** build first (`npx react-native run-android --mode release`, or the Release
scheme in Xcode) – debug builds load JavaScript from Metro and never use OTA bundles. An update
applies only to the app version it was built for (`versionName` / `MARKETING_VERSION`);
`--native-version` overrides it. All options: `node scripts/ota-bundle.mjs --help`.

{{/if}}
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
