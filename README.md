# rn-architecture-generator

Interactive CLI that generates production-ready TypeScript projects:

| Mode | What you get |
| --- | --- |
| **Frontend** | React Native app – 8 architectures, navigation (tabs, optional drawer), state management, Firebase push, i18n/RTL, social login, chat… |
| **Backend** | NestJS or Express API – 6 architectures, PostgreSQL / MySQL / MongoDB, auth (email, mobile OTP, Google / Facebook / Apple), chat, notifications, Swagger, tests – as a **monolith** or **microservices** |
| **Frontend + Backend** | Both, already connected: the backend implements exactly the API the app calls (same payloads, same encryption key) |

```sh
npx rn-architecture-generator           # interactive
npx rn-architecture-generator --dry-run # show what would be generated
```

The first question is **What do you want to generate?** – Frontend · Backend · Frontend + Backend.

## Backend

The wizard asks, in order:

1. **Framework** – NestJS · Express.js + Node.js
2. **Architecture** (with a folder preview) – Feature-Based · Layered · Clean · MVC · Modular · Enterprise.
   The business code is always **one service per feature** (auth, users, chat, notifications); the architecture decides
   the layers and folders around it (Clean / Enterprise add domain entities, repository interfaces and ports, MVC adds views…).
3. **Authentication** – none · JWT · Access + Refresh token · JWT + Refresh token + **Rotation** (reuse detection)
4. **Sign-in methods** – email + password · mobile number + OTP · Google · Facebook · Apple
5. **Password hashing** (with email) – bcrypt · Argon2 · Configurable
6. **Database** – MySQL · PostgreSQL · MongoDB, then **ORM** – Prisma · TypeORM (SQL) / Mongoose (MongoDB)
7. **Modules** – Chat (conversations, messages, media, Socket.IO) · Notifications (FCM devices, inbox, admin broadcasts)
8. **Deployment** – Monolith · Microservices (see below)
9. **Redis?** – No (default) · Yes: rate limits shared by every instance, Socket.IO across instances, a cache helper,
   OTP / verification codes with expiry (no database table). Always on for microservices.
10. **Docker?** – No (default) · Yes: `Dockerfile` + `.dockerignore` + `docker-compose.yml` (database, Redis, the API)
11. **Security & rate limiting**, **API encryption** (AES, same as the app), **Swagger / OpenAPI**
12. Summary → *Yes, generate* · *Go back and modify* · *Cancel*

Every generated backend contains:

- Validated, typed configuration (`.env` with freshly generated secrets + `.env.example`), versioned routes (`/api/v1`)
- One response envelope for every route: `{ success, message, data, meta }` / `{ success: false, message, data: null, code, errors }`
- No inline texts: every success / error message is a constant in the feature's `<feature>.messages.ts` (shared ones in `messages.ts`)
- One folder per module in the module-based architectures (routes, controller, service, schemas, messages, docs, model,
  repository, utils together); the layered ones keep the same file names in their layer folders
- Auth: register (name, email, country code + mobile number), login, mobile OTP, social sign-in, refresh, logout(-all),
  me, change / forgot / reset password (6-digit codes), roles + permissions
- Users (profile, avatar upload, paginated user list, delete account), chat (cursor-paged messages, read receipts,
  typing, online / last seen, optional groups with admins / members), devices (one row per app install: FCM token,
  platform, model, OS / app version, last active), notifications (inbox, broadcasts), legal (`GET /legal` + editable
  Terms / Privacy / Delete-account pages) – only the selected ones
- Express: plain routers (`router.get('/me', users.me)`) → controllers `(req, res)` → services. NestJS: controllers with
  one `@Endpoint()` decorator per route
- Feature-Based / Layered / MVC / Modular keep each interface in the same file as its implementation (no separate
  `interfaces/` folder); Clean / Enterprise keep strict layers with interfaces in their own files
- docs/ARCHITECTURE.md follows one real request through the files and shows how to add an endpoint / a feature
- Prettier-formatted output
- Migrations (Prisma SQL / TypeORM) and a seed script, graceful shutdown, health check with DB probe
- pino logging (secrets redacted), oxlint, Prettier
- Unit + e2e tests (Vitest + supertest) on in-memory repositories – no database needed
- A README, docs/API.md and docs/ARCHITECTURE.md describing **only** the selected features

Only the packages needed by the selected options are added to `package.json`.

### Microservices

Choosing **Microservices** (requires authentication) generates a workspace instead of one project:

| Folder | Port | What |
| --- | --- | --- |
| `gateway/` | 3000 | The only public URL – proxies `/api/v1/*` and Socket.IO to the services, aggregated health check |
| `services/identity/` | 3001 | Accounts, sign-in, tokens, profiles; publishes user changes |
| `services/chat/` | 3002 | Conversations, messages, media, Socket.IO (only with the Chat module) |
| `services/notifications/` | 3003 | Devices, inbox, broadcasts, push (only with the Notifications module) |

Each service is a normal generated backend (same framework, architecture and ORM) with **its own database**. Every
service verifies access tokens itself (shared secret); chat and notifications keep a copy of the users, updated through
Redis events. Chat asks notifications to push to offline members, and notifications sends live events through the
chat service's sockets. Clients see the same API as the monolith. With Docker, `docker-compose.yml` starts the database
server and Redis (or everything, built from each service's Dockerfile); `npm run dev` starts everything. Redis pub/sub is fire-and-forget – switch to Redis Streams or a queue for
events that must never be lost.

### Non-interactive

```sh
npx rn-architecture-generator --type backend --name my-api -y \
  --backend-framework nestjs --backend-architecture clean \
  --backend-database postgresql --backend-orm prisma \
  --backend-auth refresh-rotation --password-hashing argon2 \
  --auth-methods email,mobile,google --modules chat,notifications \
  --deployment microservices --security all --swagger
```

| Flag | Values |
| --- | --- |
| `--type` | `frontend` · `backend` · `fullstack` |
| `--backend-framework` | `nestjs` · `express` |
| `--backend-architecture` | `feature-based` · `layered` · `clean` · `mvc` · `modular` · `enterprise` |
| `--backend-database` | `postgresql` · `mysql` · `mongodb` |
| `--backend-orm` | `prisma` · `typeorm` · `mongoose` |
| `--backend-auth` | `none` · `jwt` · `access-refresh` · `refresh-rotation` |
| `--auth-methods` | comma list of `email,mobile,google,facebook,apple` |
| `--modules` | comma list of `chat,notifications`, or `none` (or ask one by one: `--chat`, `--group-chat`, `--notifications`) |
| `--terms` / `--no-terms` | `GET /legal` + editable legal pages – default on |
| `--delete-account` / `--no-delete-account` | `DELETE /users/me` – default on |
| `--deployment` | `monolith` · `microservices` |
| `--redis` / `--no-redis` | Redis (rate limits, Socket.IO adapter, cache, OTP codes) – default off, always on for microservices |
| `--docker` / `--no-docker` | Dockerfile + docker-compose.yml – default off |
| `--password-hashing` | `bcrypt` · `argon2` · `configurable` |
| `--security` | `all` · `none` · comma list of `rate-limit,auth-rate-limit,account-lockout,helmet,cors,body-limit,sanitize` |
| `--encryption` / `--no-encryption` | AES request / response bodies |
| `--swagger` / `--no-swagger` | |
| `--no-install` · `--no-git` · `--force` · `--dry-run` · `-d <dir>` | |

## Frontend + Backend

Asks the app questions first, then only the backend questions the app doesn't already answer (sign-in methods,
modules and encryption follow the app). Generates `<AppName>/mobile` and `<AppName>/backend` with one git repository,
a root README and run scripts. The app's `.env` points at `http://localhost:3000/api/v1` (rewritten to `10.0.2.2` on
the Android emulator) and every screen – sign-up with country picker + mobile number, OTP, forgot / reset password,
profile, chat, notifications – calls the real API.

## Frontend

The wizard asks the optional features before anything is generated: Google / Facebook / Apple login (each one:
**Configure** – enter the keys now, **Skip** – add it with `YOUR_…` placeholders, or **Don't include**), Chat, Group
Chat, FCM / push notifications, Terms & Conditions, Delete Account. Only the selected features are generated.

See `npx rn-architecture-generator --help` for every frontend flag (`--architecture`, `--state`, `--notifications`,
`--social-auth none|all|google,apple`, `--google-web-client-id`, `--facebook-app-id`, `--chat`, `--group-chat`,
`--terms`, `--delete-account`, `--drawer`, …).

## Development

```sh
npm install
npm run build        # compiles src/ to dist/ (the CLI runs dist/)
npm run typecheck
node bin/cli.js --dry-run
```

Templates live in `templates/` (`templates/backend/{root,shared,express,nestjs}` for the backend). Backend files are
listed in `src/backend/manifest.ts`; each belongs to a layer, and `src/backend/architectures.ts` decides where each
layer lives for every architecture.
