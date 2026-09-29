# {{DISPLAY_NAME}} API

{{FRAMEWORK_NAME}} · TypeScript · {{DATABASE_LABEL}} ({{ORM_NAME}}) · {{ARCHITECTURE_NAME}}

- **Architecture:** {{ARCHITECTURE_NAME}} – {{ARCHITECTURE_SUMMARY}} See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Authentication:** {{AUTH_NAME}}{{#if AUTH}} · password hashing: {{HASHING_NAME}}{{/if}}
- **API:** versioned under `/api/v1`, one response format everywhere{{#if SWAGGER}}, OpenAPI docs at `/api/docs`{{/if}}

---

## Quick start

```sh
{{#if DOCKER_COMPOSE}}
docker compose up -d db{{#if REDIS}} redis{{/if}}   # {{DATABASE_LABEL}}{{#if REDIS}} + Redis{{/if}} in Docker (docker-compose.yml)
{{/if}}
npm install
{{#if SQL}}
npm run db:deploy      # create the tables
{{/if}}
{{#if USERS_API}}
npm run db:seed        # {{#if AUTH}}the administrator from SEED_ADMIN_* in .env{{else}}a few demo users{{/if}}
{{/if}}
npm run dev            # http://localhost:{{PORT}}/api/v1{{#if SWAGGER}} · docs: /api/docs{{/if}}
```
{{#if !DOCKER_COMPOSE}}

You need {{DATABASE_LABEL}}{{#if REDIS}} and Redis{{/if}} running – set `DATABASE_URL`{{#if REDIS}} / `REDIS_URL`{{/if}} in `.env` (see [Database setup](#database-setup)).
{{/if}}

**New to the code?** Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – it follows one request through every file and
shows how to add an endpoint.

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment variables](#environment-variables)
4. [Database setup](#database-setup)
5. [Running](#running)
6. [API](#api)
{{#if AUTH}}
7. [Authentication](#authentication)
{{/if}}
8. [Security](#security)
9. [Logging](#logging)
10. [Testing](#testing)
11. [Project structure](#project-structure)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js **22.13+** (24 LTS recommended) and npm 10+
{{#if POSTGRES}}
- PostgreSQL **13+** (uses the built-in `gen_random_uuid()`)
{{/if}}
{{#if MYSQL}}
- MySQL **8+** (or MariaDB 10.6+)
{{/if}}
{{#if MONGO}}
- MongoDB **6+**
{{/if}}
{{#if REDIS}}
- Redis **6.2+**
{{/if}}
{{#if DOCKER_COMPOSE}}
- Or just [Docker](https://docs.docker.com/get-docker/): `docker compose up -d db{{#if REDIS}} redis{{/if}}` starts {{#if REDIS}}both{{else}}the database{{/if}} with the settings already in `.env`.
{{/if}}

## Installation

```sh
{{#if PRISMA}}
npm install            # also generates the Prisma client (src/generated/prisma)
{{else}}
npm install
{{/if}}
cp .env.example .env   # only if .env is missing – the generator already created one with fresh secrets
```

## Environment variables

All configuration lives in `.env` and is validated at startup by `env.ts` (config layer) – the app refuses to start with a clear message when something is missing or invalid.
`.env` is git-ignored; `.env.example` documents every variable.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT`, `HOST` | HTTP listener |
| `APP_URL` | Public URL, used in links sent by email |
| `API_PREFIX`, `API_VERSION` | Routes are served under `/<API_PREFIX>/<API_VERSION>` |
| `LOG_LEVEL` | `fatal` … `trace`, `silent` |
| `TRUST_PROXY` | `true` behind a reverse proxy / load balancer |
| `DATABASE_URL` | {{DATABASE_LABEL}} connection string |
{{#if REDIS}}
| `REDIS_URL` | Redis connection string (rate limits, {{#if SOCKET_SERVER}}Socket.IO, {{/if}}cache{{#if REDIS_CODES}}, verification codes{{/if}}{{#if EVENTS}}, events between services{{/if}}) |
{{/if}}
{{#if SEC_CORS}}
| `CORS_ORIGINS` | Comma separated browser origins allowed to call the API |
{{/if}}
{{#if SEC_BODY_LIMIT}}
| `BODY_LIMIT` | Max request body size (e.g. `1mb`) |
{{/if}}
{{#if SEC_RATE_LIMIT}}
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | Global rate limit per client IP |
{{/if}}
{{#if SEC_AUTH_RATE_LIMIT}}
| `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX` | Stricter limit for login / register / password reset |
{{/if}}
{{#if AUTH}}
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN` | Access token secret (≥ 32 chars) and lifetime |
{{#if AUTH_REFRESH}}
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` | Refresh token secret (different from the access secret) and lifetime |
{{/if}}
| `JWT_ISSUER`, `JWT_AUDIENCE` | `iss` / `aud` claims, checked on every token |
{{#if CODES}}
| `VERIFICATION_CODE_TTL`, `VERIFICATION_CODE_RESEND_AFTER`, `VERIFICATION_CODE_MAX_ATTEMPTS` | 6-digit codes (email / SMS) |
{{/if}}
{{#if HASH_CONFIGURABLE}}
| `PASSWORD_HASH_ALGORITHM`, `BCRYPT_ROUNDS` | `argon2` or `bcrypt` for new hashes; old hashes keep working and are upgraded at login |
{{/if}}
{{#if HASH_BCRYPT}}
| `BCRYPT_ROUNDS` | bcrypt cost factor |
{{/if}}
{{#if SEC_LOCKOUT}}
| `ACCOUNT_LOCKOUT_MAX_ATTEMPTS`, `ACCOUNT_LOCKOUT_MINUTES` | Account lockout after failed logins |
{{/if}}
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | Administrator created by `npm run db:seed` |
{{/if}}
{{#if SWAGGER}}
| `SWAGGER_ENABLED`, `SWAGGER_PATH` | API docs at `/<API_PREFIX>/<SWAGGER_PATH>` |
{{/if}}

Generate a secret: `openssl rand -base64 48`. Never commit `.env` or reuse development secrets in production.

## Database setup

{{#if DOCKER_COMPOSE}}
With Docker, `docker compose up -d db` starts {{DATABASE_LABEL}} with the database already created – skip to the commands below.
Otherwise:

{{/if}}
{{#if POSTGRES}}
Create the database (or point `DATABASE_URL` at an existing one):

```sh
createdb {{DB_NAME}}
```
{{/if}}
{{#if MYSQL}}
Create the database (or point `DATABASE_URL` at an existing one):

```sh
mysql -u root -p -e "CREATE DATABASE {{DB_NAME}} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```
{{/if}}
{{#if MONGO}}
MongoDB creates the database on first write – only `DATABASE_URL` is needed. Collections and
indexes are created when the app starts (`syncIndexes`).
{{/if}}
{{#if PRISMA}}

| Command | What it does |
| --- | --- |
| `npm run db:deploy` | Applies the migrations in `prisma/migrations` (use in CI / production) |
| `npm run db:migrate -- --name <change>` | After editing `prisma/schema.prisma`: creates + applies a migration (development) |
| `npm run db:seed` | Seeds the database (`{{SEED_TS}}`) |
| `npm run db:studio` | Browse the data in Prisma Studio |
| `npm run db:reset` | Drops the database, re-applies migrations and seeds (development only) |

First run:

```sh
npm run db:deploy && npm run db:seed
```
{{/if}}
{{#if TYPEORM}}

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | Applies pending migrations |
| `npm run db:migration:generate -- <path>/migrations/<Name>` | After changing an entity: generates a migration from the difference |
| `npm run db:revert` | Reverts the last migration |
| `npm run db:seed` | Seeds the database (`{{SEED_TS}}`) |

`synchronize` is disabled on purpose – schema changes always go through migrations.

First run:

```sh
npm run db:migrate && npm run db:seed
```
{{/if}}
{{#if MONGO}}

```sh
npm run db:seed
```
{{/if}}
{{#if AUTH}}

The seed creates the administrator from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` – change the password after the first login.
{{/if}}

## Running

```sh
npm run dev      # watch mode
npm run build    # compile to dist/
npm start        # run the compiled app
```

The API listens on `http://localhost:3000/api/v1`. The process shuts down gracefully on `SIGTERM` / `SIGINT`
(stops accepting connections, finishes in-flight requests, closes the database).

## API

The full contract – every endpoint, body, response shape{{#if REALTIME}} and Socket.IO event{{/if}} – is in
**[docs/API.md](docs/API.md)**{{#if SWAGGER}}; try it in the Swagger UI at `http://localhost:3000/api/docs`{{/if}}.

Every response has the same shape:

```json
{ "success": true, "message": "Users", "data": [], "meta": { "page": 1, "limit": 20, "total": 0 } }
```

```json
{ "success": false, "message": "Validation failed", "data": null, "code": "VALIDATION_ERROR", "errors": [{ "field": "email", "message": "must be a valid email" }] }
```

`code` is stable and machine readable – use it in the client instead of the message.

**Messages** – no route writes its own text. Every success / error message is a constant in the feature's
`<feature>.messages.ts` (e.g. `USERS_MESSAGES.profileUpdated`, `USERS_MESSAGES.notFound`); messages every feature shares
(validation, 401 / 403 / 404, rate limit…) are in `messages.ts` of the core. Change the wording there. Every response carries an
`X-Request-Id` header (also in the logs).

| Area | Routes |
| --- | --- |
| Health | `GET /api/v1/health` (503 when the database is down) |
{{#if AUTH}}
| Auth | {{AUTH_METHODS_TEXT}}{{#if AUTH_REFRESH}} · refresh · logout / logout-all{{else}} · logout{{/if}} · me |
| Users | own profile (`PATCH /users/me`, avatar upload{{#if DELETE_ACCOUNT}}, delete account{{/if}}), user list for "New chat" (paginated search), admin CRUD |
{{else}}
| Users | CRUD (no authentication – protect it before going live) |
{{/if}}
{{#if CHAT}}
| Chat | conversations, messages (text / media), read receipts, uploads{{#if GROUP_CHAT}}, groups (admins / members){{/if}} · live over Socket.IO |
{{/if}}
{{#if DEVICES}}
| Devices | the user's devices (one per app install): FCM token, platform, model, OS / app version, last active |
{{/if}}
{{#if NOTIFICATIONS}}
| Notifications | inbox (unread count, read, delete), pushes to every device, admin broadcasts |
{{/if}}
{{#if LEGAL}}
| Legal | `GET /api/v1/legal` – Terms & Conditions / Privacy Policy links (pages in `public/`) |
{{/if}}

{{#if AUTH}}
## Authentication

- Sign-in: **{{AUTH_METHODS_TEXT}}**. Every method returns the same session `{ user, tokens{{#if PASSWORDLESS}}, isNewUser{{/if}} }`.
{{#if AUTH_JWT_ONLY}}
- Send `Authorization: Bearer <accessToken>`. Tokens are revocable: logout, password change / reset, role change and
  disabling the account bump the user's *token version*, which invalidates every token issued before.
{{/if}}
{{#if AUTH_REFRESH}}
- Send `Authorization: Bearer <accessToken>`. The access token is short lived (`JWT_ACCESS_EXPIRES_IN`); on `401` call
  `POST /auth/refresh` with the refresh token and retry. Refresh tokens are stored **hashed** and can be revoked.
{{#if AUTH_ROTATION}}
- **Rotation:** every refresh returns a *new* refresh token. Presenting an already used one is treated as theft: the whole
  token family is revoked (`401 TOKEN_REUSED`).
{{/if}}
{{/if}}
{{#if CODES}}
- **6-digit codes** ({{#if AUTH_EMAIL}}email verification, password reset{{/if}}{{#if AUTH_EMAIL}}{{#if AUTH_OTP}}, {{/if}}{{/if}}{{#if AUTH_OTP}}SMS login{{/if}}) are stored hashed, expire after
  `VERIFICATION_CODE_TTL`, can be re-sent after `VERIFICATION_CODE_RESEND_AFTER` and die after `VERIFICATION_CODE_MAX_ATTEMPTS` wrong tries.
{{/if}}
{{#if AUTH_EMAIL}}
- Passwords are hashed with **{{HASHING_NAME}}**. Login answers "invalid email or password" for unknown emails and wrong
  passwords alike, with the same timing; forgot-password always answers 200 (no account enumeration).
{{#if SEC_LOCKOUT}}
- After `ACCOUNT_LOCKOUT_MAX_ATTEMPTS` failed logins the account is locked for `ACCOUNT_LOCKOUT_MINUTES` (`423 ACCOUNT_LOCKED`).
{{/if}}
- Sign-up accepts an optional mobile number (`countryCode` + `phone`, from the app's country picker). A number can belong
  to one account only (`409 PHONE_TAKEN`); a changed number becomes unverified.
{{/if}}
- **Roles & permissions:** roles (`user`, `admin`) grant permissions (`users:read`{{#if NOTIFICATIONS}}, `notifications:broadcast`{{/if}}, …) in `roles.ts`.
  Routes require a permission, not a role.

### Providers (all optional in development)

| Feature | Configure | Without configuration |
| --- | --- | --- |
{{#if AUTH_EMAIL}}
| Email (codes) | `SMTP_URL`, `MAIL_FROM` – any SMTP provider (SES, SendGrid, Mailgun…) | emails and their codes are written to the log |
{{/if}}
{{#if AUTH_OTP}}
| SMS (OTP) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | SMS codes are written to the log |
{{/if}}
{{#if SOCIAL_GOOGLE}}
| Google sign-in | `GOOGLE_CLIENT_IDS` = the web client id the app uses (+ iOS / Android ids) | sign-in answers `401 SOCIAL_NOT_CONFIGURED` |
{{/if}}
{{#if SOCIAL_FACEBOOK}}
| Facebook sign-in | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | sign-in answers `401 SOCIAL_NOT_CONFIGURED` |
{{/if}}
{{#if SOCIAL_APPLE}}
| Apple sign-in | `APPLE_CLIENT_IDS` = the iOS bundle id (default `{{APP_PACKAGE}}`) | works with the default bundle id |
{{/if}}
{{#if NOTIFICATIONS}}
| Push (FCM) | `FIREBASE_SERVICE_ACCOUNT` – path to the service account JSON (Firebase console → Project settings → Service accounts) | pushes are written to the log |
{{/if}}
| Uploads | `UPLOAD_DIR`, `UPLOAD_MAX_MB` – files are served under `/uploads` | – (local disk; use S3 / GCS with several servers) |

In production, missing email / SMS providers are logged as warnings – the codes are **not** written to the log there.
{{/if}}
{{#if CHAT}}

## Chat

{{#if GROUP_CHAT}}Direct and group conversations{{else}}Direct conversations{{/if}} with text, photos, videos, voice notes and documents. Upload the file first
(`POST /chat/upload`), then send a message with its `url` as `mediaUrl`. Members receive `chat:receive_message` over
Socket.IO (connect with `auth: { token }`); typing indicators, online status and read receipts are Socket.IO events too.
{{#if NOTIFICATIONS}}
Members who are offline get a push notification that opens the conversation.
{{/if}}
{{#if GROUP_CHAT}}

Groups (`/chat/groups`): the creator is the first admin. Admins rename the group, change its image, add / remove members
and make other members admin. When the last admin leaves (or deletes their account), the longest-standing member becomes
admin; when the last member leaves, the group is deleted. Members get `chat:conversation_updated` and reload the group.
{{/if}}
{{/if}}
{{#if NOTIFICATIONS}}

## Notifications

The app registers its device (`POST /devices`: install id, FCM token, platform, model, versions) after every sign-in,
on app start and when the token changes, and removes it on logout (`DELETE /devices/:deviceId`). Use
`NotificationsService.notify(userId, { type, title, body, data })` from any feature – it stores an inbox entry, emits
`notification:new` and pushes to the user's devices. Admins send broadcasts with `POST /notifications/broadcast`.
Tokens FCM rejects are deleted automatically.
{{/if}}
{{#if API_ENCRYPTION}}

## API encryption

With `API_ENCRYPTION_ENABLED=true`, JSON bodies are exchanged as `{ "data": "<AES-256-CBC base64>" }` using
`API_ENCRYPTION_KEY` (32 chars) and `API_ENCRYPTION_IV` (16 chars) – set the **same** values in the app's `.env`.
This only hides payloads from casual inspection; always use HTTPS.
{{/if}}
{{#if SOCKET_SERVER}}

{{#if REDIS}}
> Socket.IO uses the Redis adapter, so events reach users connected to any instance. Online status (`isOnline`)
> is still tracked per process.
{{else}}
> Online status and Socket.IO rooms live in the process memory. When running several instances, add the Socket.IO
> Redis adapter so events reach every instance.
{{/if}}
{{/if}}

## Security

{{#if SEC_HELMET}}
- **Helmet** – secure HTTP headers (CSP, HSTS, no-sniff, frameguard…).
{{/if}}
{{#if SEC_CORS}}
- **CORS allow-list** – only origins in `CORS_ORIGINS`; requests without an `Origin` header (mobile apps, server to server) are allowed.
{{/if}}
{{#if SEC_RATE_LIMIT}}
- **Rate limiting** – `RATE_LIMIT_MAX` requests per `RATE_LIMIT_WINDOW_MS` per IP, standard `RateLimit` headers, `429 TOO_MANY_REQUESTS`.
{{/if}}
{{#if SEC_AUTH_RATE_LIMIT}}
- **Auth rate limiting** – stricter limit on login, register, refresh and password/email flows.
{{/if}}
{{#if SEC_BODY_LIMIT}}
- **Body size limit** – `BODY_LIMIT` (`413 PAYLOAD_TOO_LARGE`).
{{/if}}
{{#if SEC_SANITIZE}}
- **Input sanitization** – keys starting with `$` or containing `.` and `__proto__` are removed from body, query and params.
{{/if}}
- **Validation** – every body, query and route parameter is validated ({{#if NEST}}class-validator DTOs, unknown fields rejected{{else}}zod schemas{{/if}}); errors list each field.
- **Errors** – unexpected errors return a generic 500; stack traces and internal messages are only logged.
- **Secrets** – only in environment variables; the logger redacts passwords, tokens and `Authorization` headers.
{{#if SEC_ANY_RATE_LIMIT}}

{{#if REDIS}}
> The rate limit counters are kept in Redis, so the limits apply across every instance.
{{else}}
> The rate limiter keeps its counters in memory, per process. When running several instances, use a shared store
> (e.g. Redis) so limits apply across instances.
{{/if}}
{{/if}}
{{#if REDIS}}

## Redis

One connection (`redis.ts`, `REDIS_URL`) is shared by:

{{#if SEC_ANY_RATE_LIMIT}}
- **Rate limits** – counters shared by every server instance.
{{/if}}
{{#if SOCKET_SERVER}}
- **Socket.IO** – the Redis adapter delivers events to users connected to any instance.
{{/if}}
{{#if REDIS_CODES}}
- **Verification / OTP codes** – stored with an expiry, Redis deletes them by itself (no database table).
{{/if}}
{{#if EVENTS}}
- **Events between the services** (publish / subscribe).
{{/if}}
- **Cache** – `cache.ts`, for any service:

```ts
import { cache } from '…/cache.js';

const stats = await cache.remember('stats:today', 60, () => loadStats()); // cached for 60 s
await cache.del('stats:today'); // after the data changed
```

The tests run without Redis (`REDIS_URL` is empty there): rate limits and the cache fall back to memory.
{{/if}}

## Logging

Structured JSON logs with [pino](https://getpino.io) (pretty-printed in development). One line per request
(method, URL, status, duration, request id). Use the logger from `logger.ts` – `console.*` is disallowed by the linter.
Set the verbosity with `LOG_LEVEL`.

## Testing

```sh
npm test            # unit tests (application layer, in-memory repositories)
npm run test:e2e    # HTTP tests against the real app with in-memory repositories – no database needed
npm run test:all
npm run lint && npm run typecheck
```

`test/support/in-memory-repositories.ts` implements the repository interfaces, so tests are fast and need no
database; the fake mailer captures emails so reset / verification flows are tested end to end.

## Project structure

```
{{ARCHITECTURE_TREE}}
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the rules of the architecture.

## Deployment

{{#if DOCKER}}
**With Docker** – the `Dockerfile` builds a small production image (compiled code + runtime dependencies only):

```sh
docker build -t {{APP_SLUG}} .
docker run --env-file .env -e NODE_ENV=production -p {{PORT}}:{{PORT}} {{APP_SLUG}}
```

{{#if !MICROSERVICE}}
`docker compose up -d --build` runs the API together with {{DATABASE_LABEL}}{{#if REDIS}} and Redis{{/if}} (the API container reaches them by
service name – see `docker-compose.yml`). Run {{#if SQL}}`npm run db:deploy` and {{/if}}`npm run db:seed` once from your machine first.

{{/if}}
**Without Docker:**

{{/if}}
1. `npm ci && npm run build`
2. Set the environment variables (`NODE_ENV=production`, real secrets, `DATABASE_URL`, `CORS_ORIGINS`…).
{{#if PRISMA}}
3. `npm run db:deploy` (applies migrations), then `npm start`.
{{/if}}
{{#if TYPEORM}}
3. `npm run db:deploy` (applies migrations), then `npm start`.
{{/if}}
{{#if MONGO}}
3. `npm start` (indexes are synchronised at startup).
{{/if}}
4. Health check for the load balancer / orchestrator: `GET /api/v1/health` (200 healthy, 503 degraded).

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Invalid environment configuration` at startup | The listed variables are missing / invalid – compare `.env` with `.env.example` |
| `Database not reachable, retrying…` | Check `DATABASE_URL` and that {{DATABASE_LABEL}} is running{{#if DOCKER_COMPOSE}} (`docker compose up -d db`){{/if}} |
{{#if REDIS}}
| `Redis error … ECONNREFUSED` in the log | Check `REDIS_URL` and that Redis is running{{#if DOCKER_COMPOSE}} (`docker compose up -d redis`){{/if}} |
{{/if}}
{{#if PRISMA}}
| `Cannot find module '…/generated/prisma/client.js'` | Run `npm run db:generate` (runs automatically on `npm install`) |
{{/if}}
{{#if TYPEORM}}
| `There are pending migrations` warning | Run `npm run db:migrate` |
{{/if}}
{{#if AUTH}}
| Every request answers `401 SESSION_REVOKED` | The user's tokens were invalidated (logout-all, password change, role change) – log in again |
{{/if}}
| `429 TOO_MANY_REQUESTS` in development | Raise the limits in `.env` |
