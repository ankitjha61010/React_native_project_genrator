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
9. **Security & rate limiting**, **API encryption** (AES, same as the app), **Swagger / OpenAPI**
10. Summary → *Yes, generate* · *Go back and modify* · *Cancel*

Every generated backend contains:

- Validated, typed configuration (`.env` with freshly generated secrets + `.env.example`), versioned routes (`/api/v1`)
- One response envelope `{ success, message, data, meta }` / `{ success: false, message, code, errors }`
- Auth: register (name, email, country code + mobile number), login, mobile OTP, social sign-in, refresh, logout(-all),
  me, change / forgot / reset password (6-digit codes), roles + permissions
- Users (profile, avatar upload, search), chat (cursor-paged messages, read receipts, typing, online), notifications
  (devices, inbox, broadcasts) – only the selected ones
- Express: declarative route tables (the OpenAPI document is built from them). NestJS: one `@Endpoint()` decorator per route
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
chat service's sockets. Clients see the same API as the monolith. `docker-compose.yml` starts the database server and
Redis; `npm run dev` starts everything. Redis pub/sub is fire-and-forget – switch to Redis Streams or a queue for
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
| `--modules` | comma list of `chat,notifications`, or `none` |
| `--deployment` | `monolith` · `microservices` |
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

See `npx rn-architecture-generator --help` for every frontend flag (`--architecture`, `--state`, `--notifications`,
`--social-auth`, `--drawer`, `--chat`, …).

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
