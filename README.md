# rn-architecture-generator

Interactive CLI that generates production-ready TypeScript projects:

| Mode | What you get |
| --- | --- |
| **Frontend** | React Native app – 8 architectures, navigation (tabs, optional drawer), state management, Firebase push, i18n/RTL, social login, chat… |
| **Backend** | NestJS or Express API – 6 architectures, PostgreSQL / MySQL / MongoDB, JWT auth with refresh-token rotation, security hardening, Swagger, tests |
| Frontend + Backend | *Coming next:* the two projects connected (shared API types, generated API services) |

```sh
npx rn-architecture-generator           # interactive
npx rn-architecture-generator --dry-run # show what would be generated
```

The first question is **What do you want to generate?** – Frontend, Backend (Frontend + Backend is shown but not available yet).

## Backend

The wizard asks, in order:

1. **Framework** – NestJS · Express.js + Node.js
2. **Architecture** (with a folder preview) – Feature-Based · Layered · Clean · MVC · Modular · Enterprise.
   The architecture changes the layers, not just the folders: Clean and Enterprise generate domain entities,
   repository interfaces, ports and one use-case class per action; MVC generates models, views (presenters) and controllers; …
3. **Authentication** – none · JWT · Access + Refresh token · JWT + Refresh token + **Rotation** (reuse detection)
4. **Password hashing** – bcrypt · Argon2 · Configurable (both, switchable, transparent re-hashing)
5. **Database** – MySQL · PostgreSQL · MongoDB, then **ORM** – Prisma · TypeORM (SQL) / Mongoose (MongoDB)
6. **Security & rate limiting** – global rate limiter, strict auth-route limiter, account lockout, Helmet, CORS allow-list, body size limit, input sanitization
7. **Swagger / OpenAPI**
8. Summary → *Yes, generate* · *Go back and modify* · *Cancel*

Every generated backend contains:

- Validated, typed configuration (`.env` with freshly generated secrets + `.env.example`), versioned routes (`/api/v1`)
- One response envelope `{ success, message, data, meta }` / `{ success: false, message, code, errors }`
- Auth: register, login, refresh, logout(-all), me, change / forgot / reset password, email verification (one-time hashed tokens), roles + permissions
- Framework-independent business code (services or use-cases) behind repository interfaces
- Migrations (Prisma SQL / TypeORM) and a seed script, graceful shutdown, health check with DB probe
- pino logging (secrets redacted), oxlint, Prettier
- Unit + e2e tests (Vitest + supertest) on in-memory repositories – no database needed
- A README and docs/ARCHITECTURE.md describing **only** the selected features

Only the packages needed by the selected options are added to `package.json`.

### Non-interactive

```sh
npx rn-architecture-generator --type backend --name my-api -y \
  --backend-framework nestjs --backend-architecture clean \
  --backend-database postgresql --backend-orm prisma \
  --backend-auth refresh-rotation --password-hashing argon2 \
  --security all --swagger
```

| Flag | Values |
| --- | --- |
| `--type` | `frontend` · `backend` |
| `--backend-framework` | `nestjs` · `express` |
| `--backend-architecture` | `feature-based` · `layered` · `clean` · `mvc` · `modular` · `enterprise` |
| `--backend-database` | `postgresql` · `mysql` · `mongodb` |
| `--backend-orm` | `prisma` · `typeorm` · `mongoose` |
| `--backend-auth` | `none` · `jwt` · `access-refresh` · `refresh-rotation` |
| `--password-hashing` | `bcrypt` · `argon2` · `configurable` |
| `--security` | `all` · `none` · comma list of `rate-limit,auth-rate-limit,account-lockout,helmet,cors,body-limit,sanitize` |
| `--swagger` / `--no-swagger` | |
| `--no-install` · `--no-git` · `--force` · `--dry-run` · `-d <dir>` | |

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
