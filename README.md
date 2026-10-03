# rn-architecture-generator

**One interactive command → a production-ready React Native app, a matching Node.js backend and a web admin panel, already wired together.**

```bash
npx rn-architecture-generator
```

| Mode | What you get |
|---|---|
| **Frontend** | React Native **0.87** (TypeScript) app for Android & iOS – 8 architectures, navigation, state management, auth, chat, audio/video calling, push notifications, payments, i18n/RTL… Optional web **Admin Panel**. |
| **Backend** | **NestJS** or **Express** API – 6 architectures, **PostgreSQL / MySQL / MongoDB** (Prisma, TypeORM, Mongoose), auth, chat, calling, notifications, payments, Swagger, tests – as a **monolith** or **microservices**. |
| **Frontend + Backend** | All of it in one folder (`mobile/`, `backend/`, `admin/`). The backend implements exactly the API the app calls – same payloads, same encryption key. |

Only the features you pick are generated – no dead code, no unused packages.

📖 **Full guide:** [docs/GENERATOR_GUIDE.md](https://github.com/ankitjha61010/React_native_project_genrator/blob/main/docs/GENERATOR_GUIDE.md)

---

## Contents

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Features](#features)
- [What the wizard asks](#what-the-wizard-asks)
- [Non-interactive usage (CI)](#non-interactive-usage-ci)
- [CLI reference](#cli-reference)
- [What gets generated](#what-gets-generated)
- [After generation – what you must configure](#after-generation--what-you-must-configure)
- [Running the projects](#running-the-projects)
- [Troubleshooting](#troubleshooting)
- [Developing the generator](#developing-the-generator)

---

## Requirements

| | |
|---|---|
| **Node.js** | **≥ 22.13.0** (checked before generating) |
| **npm / npx** | npm only (yarn / pnpm are not supported by the generator) |
| **OS** | macOS, Linux or Windows. iOS builds need macOS. |
| **Internet** | the React Native CLI (`@react-native-community/cli@20.2.0`) and all packages are downloaded |
| Optional | **git** (initial commit), **CocoaPods** / Bundler (macOS – `pod install`) |

To **run** the generated app: JDK 17 + Android Studio (Android), Xcode + CocoaPods (iOS), Watchman (macOS).
To run the generated backend: a PostgreSQL / MySQL / MongoDB server (or `--docker`), optionally Redis.

## Quick start

```bash
npx rn-architecture-generator             # interactive wizard
npx rn-architecture-generator --dry-run   # preview: files, folders, dependencies – writes nothing
npx rn-architecture-generator --help      # every flag
```

Or install it globally: `npm i -g rn-architecture-generator` → `rn-architecture-generator`.

The first question is **What do you want to generate?** – *Frontend* · *Backend* · *Frontend + Backend*.

---

## Features

### Mobile app (React Native, TypeScript)

| Area | What's included |
|---|---|
| **Architectures** | Atomic Design · Feature-Based · Layered · Clean · MVC · MVVM · Redux · Modular (folder preview before you confirm) |
| **State / storage** | Redux Toolkit · Zustand · Context API · none — MMKV or AsyncStorage |
| **Navigation** | Splash → Auth / Main, bottom tabs, optional side drawer, typed routes |
| **Auth** | Email + password (sign up, sign in, forgot / reset / change password), mobile number + OTP, **Google**, **Facebook**, **Apple** sign-in, logout, delete account, session restore, automatic token refresh |
| **Profile & settings** | Profile with avatar upload, edit profile, settings (language, light/dark theme), optional Google Places location |
| **Chat** | One-to-one and **group** chat (admins, members, add/remove, leave), photos / videos / documents / voice messages, photo editor (crop, rotate, filters), **video trimmer (cuts the clip on the device)**, reply (swipe), edit, delete, long-press menu, retry failed messages, typing indicator, online / last seen, read ticks, unread counts, **chat search**, block / unblock users |
| **Media viewer** | Zoomable images, native video player with pinch-zoom and seek bar, in-app PDF viewer, other files in the system viewer – no web views |
| **Calling** | **Audio and video**, one-to-one and **group**, via **Agora** · iOS **CallKit + PushKit** (rings when the app is killed) · Android native full-screen incoming call · "Calling…" screen · call history · draggable minimised call bar and camera preview |
| **Notifications** | Firebase Cloud Messaging + Notifee, notification inbox with unread badge, deep links (chat → conversation, missed call → call history), optional Firebase Analytics |
| **Payments** | In-app purchases (**react-native-iap** or **Adapty**) and/or a gateway (**Stripe**, **Razorpay**, **PayPal**), store screen, restore purchases |
| **More** | i18n (English, Hindi, + Arabic with RTL), light/dark theme, AES API encryption, OTA updates (signed bundles + rollback), Terms & Privacy links, permissions handling, flash messages, custom fonts & vector icons |

Native files (AndroidManifest, Gradle, Info.plist, Podfile, AppDelegate, entitlements, Xcode project) are patched for you for every selected feature.

### Backend (NestJS or Express)

- Versioned REST API (`/api/v1`), one response envelope `{ success, message, data, meta }`, Socket.IO real-time events
- Auth: JWT, access + refresh, or refresh **rotation** with reuse detection · email/password, mobile OTP (Twilio), Google/Facebook/Apple · bcrypt/Argon2 · roles & permissions · account lockout
- Users (profile, avatar, search, admin management), chat & groups, calling (Agora tokens, call history, **FCM + APNs VoIP push**), devices, notification inbox & admin broadcasts, legal pages, OTA releases, payments + webhooks
- Security: Helmet, CORS allow-list, rate limiting (stricter on auth), body limit, input sanitisation · optional Redis · optional Docker
- Prisma / TypeORM migrations, seed script (creates an admin), Swagger UI at `/api/docs`, pino logging, unit + e2e tests (Vitest + supertest) that run without a database
- **Microservices** option: gateway (3000) + identity (3001) + chat (3002) + notifications (3003), one database each, Redis events

### Admin panel (React + Vite or Next.js, Tailwind CSS)

Dashboard · User Management · Broadcast Notifications · Legal & Policies · Payments (with payments) · OTA Releases (with OTA). Admin-only login.

---

## What the wizard asks

**Frontend:** app name → package name (also the iOS bundle id) → location → architecture → state management → storage → API encryption → RTL → theme → vector icons → email auth → mobile OTP auth → Google / Facebook / Apple login (*Configure* now, *Skip* with `YOUR_…` placeholders, or *Don't include*) → chat → group chat → audio calls → video calls → Socket.io → push notifications → Firebase files → analytics → terms → delete account → Google Location → drawer → OTA → in-app purchases → payment gateway → admin panel → install dependencies / pods / git.

**Backend:** name → location → framework → architecture → authentication & sign-in methods → password hashing → database → ORM → modules (chat, group chat, audio/video calling, push, terms, delete account, payments) → deployment → Redis → Docker → security → encryption → Swagger → Firebase service account & Agora keys → summary (*Yes* · *Go back and modify* · *Cancel*).

**Frontend + Backend:** the app questions, then only the backend questions the app doesn't already answer.

Rules applied automatically: chat or calling turns on Socket.io and vector icons · group chat needs chat · the Redux architecture uses Redux Toolkit · microservices need authentication and always use Redis.

---

## Non-interactive usage (CI)

`--yes` uses defaults for everything not passed as a flag (`--name` is required).

```bash
# App with chat, calling and push notifications
npx rn-architecture-generator --type frontend --yes \
  --name FastRoute --package com.example.fastroute --directory ~/projects \
  --architecture feature-based --state zustand \
  --chat --group-chat --audio-call --video-call --notifications \
  --firebase-android ./google-services.json --firebase-ios ./GoogleService-Info.plist

# Backend only – NestJS, clean architecture, PostgreSQL, microservices
npx rn-architecture-generator --type backend --yes --name my-api \
  --backend-framework nestjs --backend-architecture clean \
  --backend-database postgresql --backend-orm prisma \
  --backend-auth refresh-rotation --password-hashing argon2 \
  --auth-methods email,mobile,google --modules chat,notifications \
  --deployment microservices --security all --swagger

# Everything – app + Express/MongoDB backend + Next.js admin panel
npx rn-architecture-generator --type fullstack --yes --name FastRoute --package com.example.fastroute \
  --chat --audio-call --video-call --notifications --admin-panel --admin-tech-stack next \
  --backend-framework express --backend-database mongodb --backend-orm mongoose --docker \
  --agora-app-id <AGORA_APP_ID> --agora-app-certificate <AGORA_APP_CERTIFICATE>
```

---

## CLI reference

### General

| Flag | Values / meaning |
|---|---|
| `--type <type>` | `frontend` · `backend` · `fullstack` |
| `-n, --name <name>` | app name (letters/digits, starts with a letter), e.g. `FastRoute` |
| `-p, --package <id>` | Android package / iOS bundle id, e.g. `com.example.fastroute` |
| `-d, --directory <path>` | parent folder the project folder is created in (default `./`) |
| `--rn-version <v>` | `0.87.1` (default) · `0.87` · `0.86.3` · `0.86` |
| `--dry-run` | show what would be generated, write nothing |
| `-y, --yes` | non-interactive, defaults for everything not passed |
| `-f, --force` | replace the target folder if it exists |
| `--no-install` · `--no-pods` · `--no-git` | skip `npm install` · `pod install` (macOS) · git init |
| `-v, --version` | print the version |

### App

| Flag | Values / meaning |
|---|---|
| `-a, --architecture` | `atomic` · `feature-based` · `layered` · `clean` · `mvc` · `mvvm` · `redux` · `modular` |
| `-s, --state` | `redux` · `zustand` · `context` · `none` |
| `--storage` | `mmkv` · `async-storage` |
| `--encryption` / `--no-encryption` | AES-256 request/response bodies (crypto-js) |
| `--rtl` · `--theme-context` · `--vector-icons` · `--drawer` | RTL + Arabic · light/dark theme · Material Design icons · side drawer |
| `--auth-email` · `--auth-mobile` | email auth (default on) · mobile OTP auth |
| `--social-auth` | `none` · `all` · comma list of `google,facebook,apple` |
| `--google-web-client-id` · `--google-ios-client-id` | Google Sign-In client ids |
| `--facebook-app-id` · `--facebook-client-token` · `--facebook-app-secret` | Facebook Login (secret: backend only) |
| `--apple-service-id` | Sign in with Apple Services ID (optional) |
| `--socket` · `--chat` · `--group-chat` | Socket.io client · chat · group chat |
| `--audio-call` · `--video-call` | Agora calling (one-to-one + group) |
| `--notifications` · `--analytics` | FCM + Notifee push (default on) · Firebase Analytics |
| `--firebase-android <path>` · `--firebase-ios <path>` | install `google-services.json` / `GoogleService-Info.plist` |
| `--terms` · `--delete-account` | legal links (default on) · Profile → Delete account (default on) |
| `--google-location` | current location + Google Places search |
| `--ota` | Over-The-Air updates |
| `--iap` | `none` · `iap` · `adapty` |
| `--payment-gateway` | `none` · `stripe` · `razorpay` · `paypal` |
| `--admin-panel` · `--admin-tech-stack` | generate the admin panel · `react` · `next` |

Every on/off option also has a `--no-…` form (e.g. `--no-notifications`).

### Backend

| Flag | Values / meaning |
|---|---|
| `--backend-framework` | `nestjs` · `express` |
| `--backend-architecture` | `feature-based` · `layered` · `clean` · `mvc` · `modular` · `enterprise` |
| `--backend-database` | `postgresql` · `mysql` · `mongodb` |
| `--backend-orm` | `prisma` · `typeorm` (SQL) · `mongoose` (MongoDB) |
| `--backend-auth` | `none` · `jwt` · `access-refresh` · `refresh-rotation` |
| `--auth-methods` | comma list of `email,mobile,google,facebook,apple` (`otp` = `mobile`) |
| `--password-hashing` | `bcrypt` · `argon2` · `configurable` |
| `--modules` | comma list of `chat,notifications,audio-call,video-call`, or `none` |
| `--deployment` | `monolith` · `microservices` |
| `--redis` · `--docker` · `--swagger` | Redis · Dockerfile + docker-compose · Swagger UI (default on) |
| `--security` | `all` · `none` · comma list of `helmet,cors,rate-limit,auth-rate-limit,body-limit,sanitize,account-lockout` |
| `--firebase-service-account <path>` | copied into the backend for push / call notifications |
| `--agora-app-id` · `--agora-app-certificate` | Agora keys for call tokens |

---

## What gets generated

```
Frontend                      Backend (monolith)            Frontend + Backend
<AppName>/                    <name>/                       <AppName>/
├── android/  ios/            ├── src/                      ├── mobile/    the app
├── src/  (your architecture) ├── prisma/ or migrations     ├── backend/   the API
├── .env  .env.example        ├── .env  .env.example        ├── admin/     admin panel (optional)
├── docs/ARCHITECTURE.md      ├── docs/API.md, ARCHITECTURE ├── package.json  backend · mobile · android · ios · admin · db · test
├── firebase/README.md        ├── README.md                 └── README.md
└── README.md                 └── Dockerfile (optional)
<appname>-admin/  (optional admin panel next to the app)
```

Every generated project has its own README describing **only** the features you selected.

---

## After generation – what you must configure

You only need the items for the features you enabled. Placeholders are `YOUR_…` (social login) and `…REPLACE_ME` (payments, APNs).

| Feature | Where | What |
|---|---|---|
| **API URL** | app `.env` | `API_BASE_URL` – on a real device use your computer's LAN IP (Android emulator: `localhost` is rewritten to `10.0.2.2`). Restart Metro with `npm start -- --reset-cache` after editing `.env`. |
| **Push notifications** | app | `android/app/google-services.json`, `GoogleService-Info.plist` added in Xcode, APNs key uploaded to Firebase, Push Notifications + Background Modes capabilities – see the app's `firebase/README.md` |
| | backend `.env` | `FIREBASE_SERVICE_ACCOUNT` (path to `firebase-service-account.json`) |
| **Calling** | backend `.env` | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` (the app gets the App ID from the backend) |
| **iOS calls when the app is killed** | backend `.env` | `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_PATH` (`.p8` key from Apple Developer → Keys), `APNS_BUNDLE_ID`, `APNS_PRODUCTION` – needs push notifications on. See the backend README → *iOS VoIP push (PushKit)*. |
| **Google login** | app `.env`, iOS `Info.plist`, backend `.env` | `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, URL scheme, Android SHA-1 · backend `GOOGLE_CLIENT_IDS` – see `docs/SOCIAL_LOGIN.md` |
| **Facebook login** | `strings.xml`, `Info.plist`, backend `.env` | app id, client token · backend `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| **Apple login** | Xcode | enable *Sign in with Apple* (entitlement already added) · backend `APPLE_CLIENT_IDS` |
| **Google Location** | app `.env` | `GOOGLE_MAPS_API_KEY` (enable *Places API (New)* and *Geocoding API*) |
| **Mobile OTP / emails** | backend `.env` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` · `SMTP_URL`, `MAIL_FROM` (empty `SMTP_URL` = emails are only logged) |
| **Payments** | backend `.env` (+ app `.env` for Adapty) | provider keys – see `docs/PAYMENTS.md` |
| **API encryption** | app, backend, admin `.env` | the same `API_ENCRYPTION_KEY` / `API_ENCRYPTION_IV` everywhere (fullstack generates matching ones) |
| **OTA** | app | back up `ota/ota-signing-key.pem` (git-ignored) – build updates with `npm run ota:android` / `ota:ios` |
| **Admin login** | backend `.env` | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (default `admin@example.com` / `ChangeMe123!`) – **change before deploying** |

---

## Running the projects

**App**
```bash
cd <AppName>
npx react-native run-android
npx react-native run-ios        # macOS; if pods weren't installed: cd ios && bundle install && bundle exec pod install
```

**Backend** (see its README for your database / ORM)
```bash
cd <name>
docker compose up -d db         # only with --docker (add redis with --redis)
npm run db:deploy               # SQL: apply migrations
npm run db:seed                 # creates the admin user
npm run dev                     # http://localhost:3000/api/v1 · Swagger: /api/docs
```

**Fullstack** – from the root folder: `npm run backend`, `npm run mobile`, `npm run android`, `npm run ios`, `npm run admin` (http://localhost:5173), `npm run db` (with Docker).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Node … is not supported` | install Node ≥ 22.13 |
| `npx` / network errors during init | check your connection / proxy – the React Native CLI is downloaded on every run |
| `… already exists and is not empty` | pick another `--name` / `--directory`, answer *Yes* to the overwrite question, or pass `--force` |
| `npm install` or `pod install` failed | the project is kept – run the command yourself in the project folder |
| App can't reach the backend | `API_BASE_URL` must be reachable from the device (LAN IP, same Wi-Fi); add the admin URL to the backend's `CORS_ORIGINS` |
| Push notifications don't arrive | follow the app's `firebase/README.md`; iOS needs the APNs key in Firebase and a real device |
| iOS doesn't ring when the app is killed | set the `APNS_*` values in the backend `.env` and test on a real device |

---

## Developing the generator

```bash
git clone https://github.com/ankitjha61010/React_native_project_genrator.git
cd React_native_project_genrator
npm install
npm run build          # compiles src/ → dist/ (the CLI runs dist/)
npm test               # unit tests (Vitest)
npm run typecheck
node bin/cli.js --dry-run
```

- Templates: `templates/common` (app), `templates/state`, `templates/backend/{root,shared,express,nestjs}`, `templates/admin/{react,next}`.
- App files are listed in `src/config/manifest.ts`, backend files in `src/backend/manifest.ts`; templates use `{{#if FLAG}}` blocks and `{{IMPORT:id}}` paths so every file works in every architecture.
- Package versions are pinned per React Native profile in `src/config/reactNativeVersions.ts`.

## License

[MIT](LICENSE)
