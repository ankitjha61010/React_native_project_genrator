# {{DISPLAY_NAME}} API

{{FRAMEWORK_NAME}} · TypeScript · {{DATABASE_LABEL}} ({{ORM_NAME}}) · {{ARCHITECTURE_NAME}}

- **Architecture:** {{ARCHITECTURE_NAME}} – {{ARCHITECTURE_SUMMARY}} See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Authentication:** {{AUTH_NAME}}{{#if AUTH}} · password hashing: {{HASHING_NAME}}{{/if}}
- **API:** versioned under `/api/v1`, one response format everywhere{{#if SWAGGER}}, OpenAPI docs at `/api/docs`{{/if}}

---

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
| `PASSWORD_RESET_TOKEN_TTL`, `EMAIL_VERIFICATION_TOKEN_TTL` | Lifetime of emailed one-time links |
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

Every response has the same shape:

```json
{ "success": true, "message": "Users", "data": [], "meta": { "page": 1, "limit": 20, "total": 0 } }
```

```json
{ "success": false, "message": "Validation failed", "code": "VALIDATION_ERROR", "errors": [{ "field": "email", "message": "must be a valid email" }] }
```

`code` is stable and machine readable (`VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `FORBIDDEN`, `NOT_FOUND`…) – use it in the client instead of the message.
Every response carries an `X-Request-Id` header (also in the logs).

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | public | Liveness + database check (503 when degraded) |
{{#if AUTH}}
| POST | `/api/v1/auth/register` | public | Create an account, returns the session |
| POST | `/api/v1/auth/login` | public | Email + password login |
{{#if AUTH_REFRESH}}
| POST | `/api/v1/auth/refresh` | refresh token | New {{#if AUTH_ROTATION}}token pair (rotation){{else}}access token{{/if}} |
| POST | `/api/v1/auth/logout` | refresh token | End this session |
| POST | `/api/v1/auth/logout-all` | bearer | End every session |
{{else}}
| POST | `/api/v1/auth/logout` | bearer | Invalidate every token of the user |
{{/if}}
| GET | `/api/v1/auth/me` | bearer | Current user |
| POST | `/api/v1/auth/change-password` | bearer | Change password (other sessions are signed out) |
| POST | `/api/v1/auth/forgot-password` | public | Email a reset link (always 200) |
| POST | `/api/v1/auth/reset-password` | public | Set a new password with the emailed token |
| POST | `/api/v1/auth/verify-email` | public | Confirm the email with the emailed token |
| POST | `/api/v1/auth/verify-email/request` | bearer | Send the verification email again |
| PATCH | `/api/v1/users/me` | bearer | Update your profile |
| GET | `/api/v1/users` | `users:read` | List users (`?page`, `?limit`, `?search`) |
| GET | `/api/v1/users/:id` | `users:read` | Get a user |
| PATCH | `/api/v1/users/:id` | `users:write` | Update name / role / active flag |
| DELETE | `/api/v1/users/:id` | `users:delete` | Delete a user |
{{else}}
| GET | `/api/v1/users` | public | List users (`?page`, `?limit`, `?search`) |
| POST | `/api/v1/users` | public | Create a user |
| GET | `/api/v1/users/:id` | public | Get a user |
| PATCH | `/api/v1/users/:id` | public | Update a user |
| DELETE | `/api/v1/users/:id` | public | Delete a user |

> There is no authentication – protect these routes before exposing the API.
{{/if}}
{{#if SWAGGER}}

**Interactive docs:** `http://localhost:3000/api/docs` (raw OpenAPI 3 document: `/api/docs/openapi.json`).
Click *Authorize* and paste an access token to call protected routes. Disable with `SWAGGER_ENABLED=false`.
{{/if}}
{{#if AUTH}}

## Authentication

{{#if AUTH_JWT_ONLY}}
- `register` / `login` return `{ user, tokens: { accessToken, expiresIn, … } }`. Send `Authorization: Bearer <accessToken>`.
- Tokens are revocable: every user has a *token version*. Logout, password change / reset, role change and
  disabling the account bump it, which invalidates every token issued before.
{{/if}}
{{#if AUTH_REFRESH}}
- `register` / `login` return `{ user, tokens: { accessToken, refreshToken, … } }`. Send `Authorization: Bearer <accessToken>`.
- The access token is short lived (`JWT_ACCESS_EXPIRES_IN`). When a request fails with `401 TOKEN_EXPIRED`, call
  `POST /auth/refresh` with the refresh token and retry.
- Refresh tokens are stored **hashed** in the database, so they can be revoked (logout, logout-all, password change).
{{#if AUTH_ROTATION}}
- **Rotation:** every refresh returns a *new* refresh token and revokes the old one. Presenting an already used
  refresh token is treated as theft: the whole token family is revoked (`401 TOKEN_REUSED`) and the user has to log in again.
{{/if}}
{{/if}}
- Passwords are hashed with **{{HASHING_NAME}}** – never stored or logged in plain text. Rules: at least 8
  characters, letters and numbers (`assertPasswordPolicy`).
- Login answers "invalid email or password" for both unknown emails and wrong passwords, with the same timing.
{{#if SEC_LOCKOUT}}
- After `ACCOUNT_LOCKOUT_MAX_ATTEMPTS` failed logins the account is locked for `ACCOUNT_LOCKOUT_MINUTES` (`423 ACCOUNT_LOCKED`).
{{/if}}
- **Password reset / email verification** use one-time tokens (256 bit, stored as SHA-256, expiring). Forgot-password
  always answers 200 so it can't be used to find registered emails.
- **Roles & permissions:** roles (`user`, `admin`) grant permissions (`users:read`, …) in `roles.ts`. Protect routes
  with a permission, not a role, so you can add roles without touching routes.

### Sending real email

Until an email provider is configured, emails (with their links) are **written to the log in development** and
skipped in production (`log-mailer.ts`). Implement the `Mailer` interface with your provider (SMTP, SendGrid, Resend…)
and use it where `LogMailer` is created. Links point to `APP_URL/reset-password?token=…` and `APP_URL/verify-email?token=…` –
point `APP_URL` at the page / deep link of your app that calls the API.
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

> The rate limiter keeps its counters in memory, per process. When running several instances, use a shared store
> (e.g. Redis) so limits apply across instances.
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
| `Database not reachable, retrying…` | Check `DATABASE_URL` and that {{DATABASE_LABEL}} is running |
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
