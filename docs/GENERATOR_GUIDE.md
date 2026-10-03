# rn-architecture-generator – Developer Guide

> Every statement in this guide was checked against the generator's source code (`src/` and `templates/`).
> Items marked **⚠ Needs confirmation** could not be verified from the source alone.

---

## 1. Introduction

### What this package is

`rn-architecture-generator` (version `1.0.0`) is an **interactive command-line tool**. It asks you a series of questions and then writes a complete, ready-to-run project to disk.

It can generate three kinds of output. The first question decides which one (`src/index.ts`):

| Choice | What you get |
|---|---|
| **1. Frontend** | A React Native (TypeScript) mobile app for Android and iOS. A web **Admin Panel** is optional. |
| **2. Backend** | A Node.js API server, built with NestJS or Express. |
| **3. Frontend + Backend** ("fullstack") | The mobile app, the backend and the optional admin panel in one folder. They are pre-wired to talk to each other. |

### What problem it solves

Starting a production React Native app usually means days of setup before the first feature:
- choosing a folder structure
- adding navigation, state management, storage and an API client
- wiring Firebase push notifications
- patching native Android and iOS files
- building authentication, chat and calling from scratch

The generator does all of this in one run. It also patches the native files for you: AndroidManifest, Gradle, Info.plist, Podfile, AppDelegate and entitlements.

### Who should use it

- Teams starting a **new** React Native app who want a consistent architecture from day one.
- Developers who need common features out of the box: auth, real-time chat, audio/video calling, push notifications and payments.
- Developers who also need a matching backend and admin panel without writing the boilerplate.

You should be comfortable with React Native, TypeScript and Node.js. You need to know how to run an app on an Android emulator or the iOS simulator.

### What kind of application it generates

**Mobile app**
- React Native **0.87.1** by default (0.86.3 is also supported), React **19.2.3**, TypeScript.
- Created with the official `@react-native-community/cli` (`init`), then extended.
- Your choice of **8 architectures**:

| Architecture | Option value |
|---|---|
| Atomic Design | `atomic` |
| Feature-Based | `feature-based` |
| Layered | `layered` |
| Clean | `clean` |
| MVC | `mvc` |
| MVVM | `mvvm` |
| Redux / State Management | `redux` |
| Modular | `modular` |

- Your choice of state management: Redux Toolkit, Zustand, Context API or none.
- Your choice of storage: MMKV or AsyncStorage.

**Backend (optional)**
- NestJS or Express.
- Database and data layer: PostgreSQL, MySQL or MongoDB, with Prisma, TypeORM or Mongoose.
- Deployment: a monolith or microservices.

**Admin panel (optional)**
- React (Vite + Tailwind CSS) or Next.js (App Router + Tailwind CSS).

### What you get after running the generator

**Frontend.** A folder `<directory>/<AppName>` containing:
- the React Native project, with `android/` and `ios/` already patched for the features you chose
- source code laid out in the architecture you picked
- `.env` and `.env.example` with the environment keys the app needs
- generated documentation: `README.md`, `docs/ARCHITECTURE.md`, `firebase/README.md`, and `docs/SOCIAL_LOGIN.md` / `docs/PAYMENTS.md` when those features are on
- installed npm dependencies (unless `--no-install`), installed CocoaPods on macOS (unless `--no-pods`), and a git repository with an initial commit (unless `--no-git`)
- optionally, an admin panel next to it in `<directory>/<appname>-admin`

**Backend.** A folder `<directory>/<name>` (default name `my-api`) containing:
- the API server
- `.env` / `.env.example`
- `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md` (plus `docs/PAYMENTS.md` with payments)
- optional Docker files

**Fullstack.** One folder `<directory>/<AppName>/` containing:

```
<AppName>/
├── mobile/      React Native app (API URL preset to http://localhost:3000/api/v1)
├── backend/     API server (monolith, or gateway + services/ for microservices)
├── admin/       Admin panel (only if you chose it)
├── package.json Root scripts: backend, mobile, android, ios, test (+ admin, db when relevant)
├── README.md
└── .gitignore
```

A single git repository is created at the root. In fullstack mode the backend always has authentication. It always supports email + password, plus whatever sign-in methods you chose for the app. If you enable API encryption, the same AES key and IV are shared by all three projects.

### High-level architecture

```mermaid
flowchart LR
  subgraph Mobile["Mobile app (React Native)"]
    UI[Screens] --> Hooks --> Services
    Services --> API["axios apiClient<br/>(token refresh, optional AES)"]
    Services --> Socket["socket.io-client"]
    Services --> Native["Native SDKs<br/>Firebase · Agora · CallKeep · Google/Facebook/Apple"]
  end
  subgraph Backend["Backend (NestJS / Express)"]
    REST["REST /api/v1"] --> DB[(PostgreSQL / MySQL / MongoDB)]
    WS["Socket.IO"]
    REST --> FCM["firebase-admin (FCM)"]
    REST --> Agora["Agora token"]
  end
  Admin["Admin Panel (React / Next.js)"] --> REST
  API --> REST
  Socket --> WS
```

**How the app talks to the backend**
- **REST** at `API_BASE_URL` (for example `http://localhost:3000/api/v1`) handles requests and actions. Sending a chat message is also a REST call.
- **Socket.IO** (`SOCKET_URL`, which defaults to the origin of `API_BASE_URL`) delivers live events: new messages, typing, presence, incoming calls and new notifications.
- Every successful response uses the format `{ success, message, data, meta }`. The app's API client unwraps it automatically.

**How the generator itself works** (`src/generators/projectGenerator.ts`)
1. Checks the Node version, the React Native profile and that `npm` / `npx` are available.
2. Renders **every** template in memory first. Templates use `{{#if FLAG}}` blocks and `{{IMPORT:id}}` paths, so the same feature works in every architecture.
3. Runs `@react-native-community/cli init`.
4. Writes the architecture files, links fonts and writes `package.json` dependencies with exact versions.
5. Patches native files feature by feature: Firebase, notifications, chat (microphone, PDF viewer), calling, OTA, location and social login.
6. If any step up to this point fails, the project folder is deleted ("Rolled back").
7. Runs `npm install`, `pod install` and `git init`. A failure here is only a warning; the project is kept.

---

## 2. Features

The table below lists **only features that exist in the generator's templates**. "Option" is the interactive question or CLI flag that turns the feature on.

### 2.1 Feature checklist

| Feature | Exists? | Mobile option | Notes |
|---|---|---|---|
| Email/password **signup** | ✅ | Email Authentication (`--auth-email`, default **on**) | Register screen collects name, email, phone, password and confirmation. `POST /auth/register` |
| Email/password **signin** | ✅ | always | Login screen, `POST /auth/login`. See note A below. |
| Forgot / reset password | ✅ | `--auth-email` | Code sent by email. `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Change password | ✅ | `--auth-email` | Profile → Change Password. `POST /auth/change-password` |
| Mobile number + OTP login | ✅ | Mobile OTP Authentication (`--auth-mobile`, default off) | Country picker. `POST /auth/otp/send`, `/auth/otp/verify`. The backend sends SMS through Twilio. |
| **Google** sign-in | ✅ | `--social-auth google` | `@react-native-google-signin/google-signin`, then `POST /auth/social` |
| **Facebook** sign-in | ✅ | `--social-auth facebook` | `react-native-fbsdk-next` (supports iOS Limited Login) |
| **Apple** sign-in | ✅ | `--social-auth apple` | `@invertase/react-native-apple-authentication`, iOS 13+ only |
| **Logout** | ✅ | always | Profile, Settings and the Drawer. Calls the server, clears tokens, disconnects the socket, clears the inbox and signs out of the social SDKs. |
| Session restore + token refresh | ✅ | always | Splash screen restores the session. Requests that get a 401 share a single refresh call (`POST /auth/refresh`). |
| Delete account | ✅ | Delete Account (`--delete-account`, default **on**) | Profile → Delete account. `DELETE /users/me` |
| **User profile** | ✅ | always | Profile tab. Edit Profile changes name, phone, bio, avatar and location. `PATCH /users/me`, `POST /users/me/avatar` |
| **User management** | ✅ admin panel only | Admin Panel (`--admin-panel`) | The admin panel's "User Management" page uses the admin `GET/PATCH/DELETE /users/:id` routes. The mobile app has no user management. |
| User search | ✅ | Chat | Used in New Chat, Create Group and Group Info (add members). `GET /users/search` |
| **Block / unblock users** | ✅ | Chat | Chat details toggle, plus a Blocked Users screen (Profile → Privacy). A blocked user cannot be called. |
| **One-to-one chat** | ✅ | Chat (`--chat`, default off) | Chat list, chat room, new chat, chat details |
| **Group chat** | ✅ | Group Chat (`--group-chat`, needs chat) | Create a group, rename it, set its image, add or remove members, make or remove admins, leave |
| **Audio calling** (1:1) | ✅ | Audio Calling (`--audio-call`) | Agora RTC. iOS uses CallKeep and VoIP push; Android uses a native incoming-call screen. |
| **Video calling** (1:1) | ✅ | Video Calling (`--video-call`) | Agora RTC, camera flip, camera on/off |
| **Group audio calling** | ✅ | `--audio-call` with group chat | The group chat header starts a group call (`POST /calls/group`, join/leave) |
| **Group video calling** | ✅ | `--video-call` with group chat | Same as group audio calling |
| Call history | ✅ | Audio or video calling | "Calls" tab, with delete one and clear all. A missed-call notification opens the `CallHistory` screen. |
| "Calling…" screen | ✅ | Audio or video calling | The caller sees `OutgoingCallScreen` with Cancel until the other side picks up |
| Minimised call | ✅ | Audio or video calling | Going back during a call shrinks it into a draggable floating bar |
| **Push notifications** | ✅ | FCM / Push Notification (`--notifications`, default **on**) | Firebase Cloud Messaging + Notifee. Notification inbox screen and header bell with unread badge. |
| Firebase Analytics | ✅ | `--analytics` (default off) | Automatic screen tracking plus `analyticsService` |
| **Media / file sharing** | ✅ | Chat | Photos, videos, documents and voice messages. Photo editor (crop, rotate, filters). Video trimmer that cuts the clip on the device (see note B). |
| Media viewer | ✅ | Chat | Zoomable images and video (`react-native-video`). In-app PDF viewer (`react-native-pdf`). Other files open in the system viewer. |
| **Online / offline status, presence** | ✅ | Chat | `presence:user_online` / `presence:user_offline` socket events. The chat header shows "online" or "last seen …". |
| Typing indicator | ✅ | Chat | `presence:typing` / `presence:stop_typing` |
| **Message status** | ✅ | Chat | sending → sent → read (blue ticks), or failed (tap to retry) |
| Unread counts | ✅ | Chat | Badge per conversation in the chat list |
| Reply / edit / delete messages | ✅ | Chat | Swipe right to reply. Long-press menu with reply, edit (your own text) and delete (your own messages). |
| Clear chat / delete chat | ✅ | Chat | Per conversation, or all chats at once |
| **Search** | ✅ | Chat | Chat list search (chat name, members, last message – over the loaded chats) and user search (New Chat, Create Group, add members). There is no full-text search across all messages. |
| **Settings** | ✅ | always | Language switcher and light/dark theme toggle (theme only with Theme Context), plus logout. See note C. |
| **Permissions** | ✅ | always | `react-native-permissions` handles camera and notifications, microphone (chat), and location (Google Location). Calling uses Android `PermissionsAndroid` directly. |
| Google Location + Places search | ✅ | `--google-location` (default off) | Current location and Places Autocomplete (New). Used for the profile location field. |
| Terms & Privacy links | ✅ | Terms & Conditions (`--terms`, default **on**) | Links read from `GET /legal` and opened in an in-app WebView |
| Over-The-Air (OTA) updates | ✅ | `--ota` (default off) | Signed JavaScript bundle updates with rollback, plus `npm run ota:android` / `ota:ios` |
| In-app purchases | ✅ | `--iap iap` or `--iap adapty` | `react-native-iap` (verified by the backend) or Adapty. Includes Store screen and restore purchases. |
| Payment gateway | ✅ | `--payment-gateway stripe\|razorpay\|paypal` | Stripe PaymentSheet, Razorpay Checkout, PayPal (approval page in a WebView) |
| Internationalisation (i18n) | ✅ | always | English and Hindi, plus Arabic when RTL is on |
| RTL layout | ✅ | `--rtl` | No app restart needed when switching direction |
| Light / dark theme | ✅ | `--theme-context` | Cycles light → dark → system, remembered between launches |
| Drawer navigation | ✅ | `--drawer` | Side drawer around the bottom tabs |
| API encryption | ✅ | `--encryption` | AES-256-CBC (crypto-js) request and response bodies |
| Admin panel | ✅ | `--admin-panel` | Dashboard, User Management, Broadcast Notifications, Legal & Policies, OTA Releases, Payments |

**Note A – email fields on the login screen.** The email and password fields and the Login button are shown with Email Authentication. Without it they are hidden, unless no other sign-in method (mobile OTP or social) is enabled – then email login stays as the only way in (`EMAIL_LOGIN` flag, `templates/common/auth/components/LoginForm/LoginForm.tsx`).

**Note B – video trimming.** Drag the handles (or slide the selection) to choose the part to keep. On Send, the app cuts that part into a new MP4 on the device with `react-native-video-trim` (FFmpeg, frame-accurate) and uploads only that file. If the whole video is selected, the original file is sent unchanged.

**Note C – how to reach Settings.** Profile → Settings (always), and the Drawer when `--drawer` is on.

### 2.2 Chat in more detail

- **Sending.** Messages are sent with REST: `POST /chat/conversations/:id/messages`. Media is uploaded first (`POST /chat/upload`, or `/chat/upload-voice` for voice notes). The message appears immediately as "sending".
- **Receiving.** New messages arrive over the socket (`chat:receive_message`).
- **Message types.** `text`, `image`, `video`, `audio`, `document`, and `system` (member added, call log, missed call).
- **Call logs.** Calls appear in the chat as small bubbles. Tapping one calls back.
- **Long-press.** Opens a small menu next to the message, similar to WhatsApp.
- **Older messages.** Load as you scroll up (30 per page).

### 2.3 Calling in more detail

- **Agora.** Audio and video are handled by Agora RTC (`react-native-agora`). **WebRTC is not used.**
- **Agora App ID.** The app has **no Agora key in its `.env`**. It receives the App ID and a token from the backend (`POST /calls/:id/agora-token`). The App ID and App Certificate are set in the **backend** `.env`.
- **iOS.** Uses CallKit (`react-native-callkeep`) and PushKit (`react-native-voip-push-notification`). A generated native file, `ios/<App>/VoipPushHandler.m`, receives VoIP pushes and reports the call to CallKit immediately – even when the app is killed and JavaScript is not running yet, as iOS requires. Every delivery of a call (socket, FCM, VoIP push) carries the same CallKit `uuid`, so a call never rings twice. While a CallKit call is active, CallKit owns the audio session; the app starts call audio only after CallKit activates it.
- **iOS VoIP pushes need the backend `APNS_*` settings** (see 3.4) and push notifications enabled.
- **Android.** The generator adds a native incoming-call activity, notification and broadcast receiver.
- **Call controls.** Mute, speaker, camera on/off and flip camera.
- **Minimised call.** Shrinks into a draggable floating bar. In a video call, your own camera preview can also be dragged.

### 2.4 Backend features (Backend / Fullstack)

All routes live under `/api/v1`. Each group is only generated when its module is on.

| Group | Main routes |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/register`, `login`, `otp/send`, `otp/verify`, `social`, `refresh`, `logout`, `logout-all`, `change-password`, `forgot-password`, `reset-password`, `verify-email/request`, `verify-email`; `GET /auth/me` |
| Users | `PATCH /users/me`, `POST\|DELETE /users/me/avatar`, `DELETE /users/me`, `GET /users/search`; admin: `GET /users`, `GET\|PATCH\|DELETE /users/:id`, `POST\|DELETE /users/:id/avatar` |
| Chat | Conversations and messages, `read`, `clear`, block and unblock, groups (`/chat/groups…`), uploads (`/chat/upload`, `/chat/upload-voice`) |
| Calls | `POST /calls`, `/calls/group`, accept / reject / end / end-for-all / cancel / join / leave / agora-token, history, active, participants, `POST /calls/voip-token` (stores the iOS VoIP token on your latest iOS device) |
| Devices | `GET /devices`, `PATCH /devices/:deviceId` (FCM token), `PATCH /devices/:deviceId/voip-token` |
| Notifications | List, unread count, read, read-all, delete; admin broadcast routes |
| Legal | `GET /legal` (public), `PUT /legal` (admin); static terms, privacy and delete-account pages |
| OTA | `GET /ota/check`, `POST /ota/download-event`, admin release management and rollback |
| Payments | Products, checkout, confirm, history, IAP verify, Adapty sync, provider webhooks, admin stats / products / entitlements / refunds |

**Other backend features**
- Socket.IO on the same host and port as the API.
- Swagger UI at `/api/docs`, unless you turn it off.
- Security middleware: Helmet, CORS allow-list, rate limiting (stricter on auth routes), body size limit, input sanitisation, account lockout.
- Optional Redis.
- Optional Docker.
- Uploaded files are stored on **local disk** (`UPLOAD_DIR`) and served at `/uploads`. There is no S3 or cloud-storage option.

### 2.5 Limitations to know before you ship

- **Microservices have no calling.** The microservices layout includes identity, chat and notifications services only; audio/video calling is generated for the monolith.
- **APNs VoIP needs push notifications.** VoIP tokens are stored on device records, which exist only with the notifications module.
- **Uploads are stored on local disk** (`UPLOAD_DIR`). Use a shared volume or add your own storage adapter when you run several backend instances.
- **Chat search** filters the conversations already loaded on the device; there is no server-side message search.

---

## 3. Requirements

### 3.1 For running the generator

| Requirement | Details | Source |
|---|---|---|
| **Node.js** | **≥ 22.13.0**. Required by `engines` and checked at runtime for frontend and fullstack generation. | `package.json`, `src/config/reactNativeVersions.ts` |
| **npm / npx** | **npm only.** Yarn and pnpm are not supported. The generator checks that `npm` and `npx` are on your `PATH`. | `src/generators/projectGenerator.ts`, `src/utils/exec.ts` |
| Operating system | macOS (`darwin`), Linux or Windows (`win32`) | `projectGenerator.ts` preflight |
| Internet | `npx` downloads `@react-native-community/cli@20.2.0`, and npm downloads all dependencies | `src/generators/reactNativeInit.ts` |
| Git | Optional. If git is not found, git initialisation is skipped. | `src/generators/gitGenerator.ts` |
| CocoaPods / Bundler | Optional, macOS only. Used for `pod install` (`bundle exec pod install` when Bundler is available). | `src/generators/dependencyGenerator.ts` |
| Interactive terminal | Interactive mode needs a TTY. In CI, use `--yes` and flags. | `src/cli/prompts.ts` |

### 3.2 For building and running the generated mobile app

The generator does **not** check for these tools. The list comes from the generated app's README (`templates/common/root/README.md`):

- Node ≥ 22.13
- Watchman (macOS)
- **JDK 17** and **Android Studio** (Android SDK) for Android
- **Xcode + CocoaPods** for iOS (macOS only)

### 3.3 Backend requirements

| Requirement | Details |
|---|---|
| Node.js | ≥ 22.13.0 (`engines` in the generated backend). Docker images use `node:22-slim`. |
| Database | One of **PostgreSQL**, **MySQL** or **MongoDB**, chosen in the wizard. Default development URLs: `postgresql://postgres:postgres@localhost:5432/<db>?schema=public`, `mysql://root:root@localhost:3306/<db>`, `mongodb://localhost:27017/<db>`. With `--docker`, `docker-compose.yml` starts `postgres:17`, `mysql:8.4` or `mongo:8`. |
| Redis | Optional for a monolith (rate limits, Socket.IO adapter, cache, OTP codes). **Required for microservices.** `docker-compose.yml` provides `redis:8` when Docker is chosen. |
| Docker | Optional (`--docker`) |

### 3.4 External services and API keys

You only need the services for the features you enable.

| Service | Needed for | Where the keys go |
|---|---|---|
| **Firebase** | Push notifications, analytics, and call notifications on the backend | App: `android/app/google-services.json` and `ios/…/GoogleService-Info.plist` (see `firebase/README.md`). Backend: `FIREBASE_SERVICE_ACCOUNT` (path to `firebase-service-account.json`). iOS push also needs an **APNs key uploaded to Firebase**, the Push Notifications capability and Background Modes → Remote notifications. |
| **Agora** | Audio and video calling | Backend `.env`: `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`. Not needed in the app. |
| **Google Sign-In** (OAuth) | Google login | App `.env`: `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`. iOS `Info.plist` URL scheme. Android SHA-1 in Google Cloud Console. Backend: `GOOGLE_CLIENT_IDS`. |
| **Facebook Login** (OAuth) | Facebook login | Android `strings.xml` (`facebook_app_id`, `fb_login_protocol_scheme`, `facebook_client_token`). iOS `Info.plist`. Android key hash in the Meta console. Backend: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`. |
| **Apple Push Notification service (APNs) – VoIP** | iOS incoming calls when the app is in the background or killed | Backend `.env`: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_PATH` (`.p8` auth key from Apple Developer → Keys, default `./keys/AuthKey_REPLACE_ME.p8`), `APNS_BUNDLE_ID` (defaults to the app package id), `APNS_PRODUCTION` (`false` for development builds). Requires the notifications module. |
| **Sign in with Apple** | Apple login | Enable the "Sign in with Apple" capability for your bundle id (the entitlement is generated). Backend: `APPLE_CLIENT_IDS`. |
| **Google Maps Platform** | Google Location | App `.env`: `GOOGLE_MAPS_API_KEY`. Enable **Places API (New)** and **Geocoding API**. |
| **Twilio** | Mobile OTP SMS (backend) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` |
| **SMTP server** | Emails such as reset codes (backend) | `SMTP_URL`, `MAIL_FROM`. If `SMTP_URL` is empty, emails are only logged. |
| **Stripe / Razorpay / PayPal** | Payment gateway | Backend `.env` only (for example `STRIPE_SECRET_KEY`, `RAZORPAY_KEY_ID`, `PAYPAL_CLIENT_ID`). The app receives the public key from the backend at checkout. |
| **Apple App Store / Google Play** | `react-native-iap` purchases | Backend: `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_PRIVATE_KEY` (`.p8`), `GOOGLE_PLAY_SERVICE_ACCOUNT` (JSON) |
| **Adapty** | Adapty purchases | App: `ADAPTY_PUBLIC_SDK_KEY`. Backend: `ADAPTY_SECRET_KEY`, `ADAPTY_WEBHOOK_TOKEN`. |

Placeholder values to replace:
- Social login keys you skipped are written as `YOUR_…`.
- Payment keys you skipped are written as `…REPLACE_ME`.

**WebRTC:** not used anywhere. Calling is Agora only.

---

## 4. Installation

### 4.1 Option A – run with npx

The README documents this usage:

```bash
npx rn-architecture-generator
```

Preview what would be generated without writing any files:

```bash
npx rn-architecture-generator --dry-run
```

Or install it globally: `npm i -g rn-architecture-generator`, then run `rn-architecture-generator`.

### 4.2 Option B – run from a clone of this repository

The CLI (`bin/cli.js`) runs the **compiled** code in `dist/`. `dist/` is git-ignored, so you must build once after cloning:

```bash
git clone <this-repository-url>
cd React_native_project_genrator
npm install          # install the generator's own dependencies
npm run build        # compile src/ → dist/
npm run generate     # same as: node bin/cli.js
```

Other useful scripts in this repo:

| Script | What it does |
|---|---|
| `npm run build` | Compile TypeScript (`tsc -p tsconfig.build.json`) |
| `npm run dev` | Compile in watch mode |
| `npm run typecheck` | Type-check without emitting files |
| `npm test` | Run the unit tests (Vitest) |
| `node bin/cli.js --dry-run` | Run the wizard, but write nothing |

### 4.3 Your first run (interactive)

```bash
npm run generate
```

1. **"What do you want to generate?"** Choose Frontend, Backend or Frontend + Backend.
2. **Frontend questions**, in order:
   1. app name (letters and digits, starting with a letter; for example `FastRoute`)
   2. package name (for example `com.example.fastroute`; also used as the iOS bundle id)
   3. location
   4. architecture (a folder preview is shown before you confirm)
   5. state management
   6. storage
   7. API encryption
   8. RTL
   9. theme
   10. vector icons
   11. email auth
   12. mobile OTP auth
   13. Google / Facebook / Apple login
   14. chat, then group chat
   15. audio calls
   16. video calls
   17. Socket.io (only if chat and calling are off)
   18. push notifications
   19. Firebase files
   20. analytics
   21. terms
   22. delete account
   23. Google Location
   24. drawer
   25. OTA
   26. in-app purchases
   27. payment gateway
   28. admin panel
   29. install dependencies, install pods, git
3. **Backend questions** (Backend / Fullstack):
   1. name and location (backend-only mode; fullstack sets them for you)
   2. framework
   3. architecture
   4. authentication and sign-in methods
   5. password hashing
   6. database
   7. ORM
   8. modules (backend-only mode; fullstack copies them from the app)
   9. deployment
   10. Redis
   11. Docker
   12. security
   13. encryption (backend-only mode; fullstack shares the app's choice)
   14. Swagger
   15. Firebase service account and Agora keys (when notifications or calls are on)
   16. a final summary to confirm

**Options that switch others on automatically**
- Chat, audio calling or video calling forces **Socket.io** and **vector icons** on.
- Group chat is only offered when chat is on.
- The `redux` architecture forces Redux Toolkit state management.
- Microservices requires authentication and forces Redis on.

### 4.4 Non-interactive run (CI / scripts)

`--yes` uses the defaults for everything you do not pass as a flag. `--name` is required with `--yes`.

```bash
# Frontend app with chat, group chat, calling and push notifications
npm run generate -- --type frontend --yes \
  --name FastRoute --package com.example.fastroute --directory ~/projects \
  --architecture feature-based --state zustand --storage mmkv \
  --chat --group-chat --audio-call --video-call --notifications \
  --firebase-android ./google-services.json --firebase-ios ./GoogleService-Info.plist
```

```bash
# Fullstack: app + NestJS/PostgreSQL backend + Next.js admin panel
npm run generate -- --type fullstack --yes \
  --name FastRoute --package com.example.fastroute \
  --chat --admin-panel --admin-tech-stack next \
  --backend-framework nestjs --backend-database postgresql --backend-orm prisma \
  --agora-app-id <id> --agora-app-certificate <cert>
```

(With `npx`, drop `npm run generate --` and use `npx rn-architecture-generator …`.)

Run `--help` for the full list of flags. The most important ones:

| Flag | Values |
|---|---|
| `--type` | `frontend`, `backend`, `fullstack` |
| `-n, --name` / `-p, --package` / `-d, --directory` | app name, package id, parent folder |
| `-a, --architecture` | `atomic`, `feature-based`, `layered`, `clean`, `mvc`, `mvvm`, `redux`, `modular` |
| `-s, --state` | `redux`, `zustand`, `context`, `none` |
| `--storage` | `mmkv`, `async-storage` |
| `--rn-version` | `0.87.1` (default), `0.87`, `0.86.3`, `0.86`. There is no interactive question for this. |
| `--social-auth` | `none`, `all`, or a comma list of `google,facebook,apple` |
| `--iap` / `--payment-gateway` | `none,iap,adapty` / `none,stripe,razorpay,paypal` |
| `--backend-framework` / `--backend-database` / `--backend-orm` | `nestjs,express` / `postgresql,mysql,mongodb` / `prisma,typeorm,mongoose` |
| `--deployment` | `monolith`, `microservices` |
| `--dry-run` | preview only |
| `-f, --force` | delete and replace a non-empty target folder |
| `--no-install`, `--no-pods`, `--no-git` | skip `npm install`, `pod install` or `git init` |

Every feature also has an on/off flag pair, for example `--chat` / `--no-chat` or `--ota` / `--no-ota`.

### 4.5 What the generator runs for you

These are the exact commands, for reference or for running them by hand if an automatic step failed:

```bash
# 1. Create the React Native project (run in the parent directory)
npx --yes @react-native-community/cli@20.2.0 init <AppName> --version 0.87.1 \
  --package-name <package> --title "<Display Name>" --directory <projectDir> \
  --pm npm --skip-install --skip-git-init --install-pods false

# 2. Install dependencies (skipped with --no-install)
npm install --no-audit --no-fund

# 3. iOS pods – macOS only (skipped with --no-pods)
bundle install && cd ios && bundle exec pod install   # or: cd ios && pod install

# 4. Git (skipped with --no-git, or if git is missing)
git init && git add -A && git commit -m "Initial commit from rn-architecture-generator"
```

Steps 2–4 are not rolled back if they fail. The CLI prints a warning and the project is kept, so you can run the command yourself.

### 4.6 Running the generated mobile app

The CLI prints these next steps when it finishes (`src/index.ts`):

```bash
cd <AppName>
# iOS only, if pods were not installed:
cd ios && bundle install && bundle exec pod install && cd ..
npx react-native run-android
npx react-native run-ios
```

**Before the first run, check `.env`**
- Set `API_BASE_URL` to your backend. On a real device, use your computer's LAN IP, not `localhost`. On the Android emulator, `localhost` is rewritten to `10.0.2.2` automatically.
- After changing `.env`, restart Metro with `npm start -- --reset-cache`.

**For push notifications**, follow `firebase/README.md` inside the generated app. **For architecture details**, see `docs/ARCHITECTURE.md`.

### 4.7 Running the generated backend

See the generated backend's own `README.md` for the full quick start (database setup, `db:migrate`, `db:seed`, running).

In fullstack mode, the root `package.json` adds shortcuts:

```bash
npm run backend   # start the API
npm run mobile    # start Metro
npm run android   # run the app on Android
npm run ios       # run the app on iOS
npm run admin     # start the admin panel (only if generated) – http://localhost:5173
npm run db        # start the database containers (only with --docker)
```

The admin panel signs in with `POST /auth/login` and only allows users whose role is `ADMIN`. The backend seeds an admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (defaults `admin@example.com` / `ChangeMe123!`). **Change these before deploying.**

> ⚠ **Needs confirmation:** the exact script names (beyond `db:migrate`, `db:deploy` and `db:seed`) and the database setup order differ by framework and ORM. Follow the generated backend `README.md`.
