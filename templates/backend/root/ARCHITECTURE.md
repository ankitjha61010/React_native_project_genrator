# Architecture – {{ARCHITECTURE_NAME}}

{{ARCHITECTURE_SUMMARY}}

```
{{ARCHITECTURE_TREE}}
```

{{#if USERS_API}}
## How a request flows (start here)

The easiest way to learn the code: follow one real request through it.
{{#if AUTH}}
Example – `PATCH /api/v1/users/me` (update your profile):
{{else}}
Example – `GET /api/v1/users/:id`:
{{/if}}

{{#if EXPRESS}}
| # | File | What happens |
| --- | --- | --- |
| 1 | `{{PATH_APP}}` | Middleware every request goes through: request log, security headers{{#if SEC_RATE_LIMIT}}, rate limit{{/if}}{{#if SEC_SANITIZE}}, input sanitizing{{/if}}. |
| 2 | `{{PATH_ROUTES_INDEX}}` | `/users` → the users router. |
{{#if AUTH}}
| 3 | `{{PATH_USERS_ROUTES}}` | `router.patch('/me', users.updateProfile)` – `requireAuth` (for every /users route) checks the token and sets `req.user`. |
| 4 | `{{PATH_USERS_CONTROLLER}}` | `updateProfile`: validates the body with `updateProfileSchema` (`{{PATH_USERS_SCHEMAS}}`), calls the service, sends the response. |
| 5 | `{{PATH_USERS_SERVICE}}` | `updateProfile()`: the business rules (a mobile number must be unique, a new number must be verified again…). |
{{else}}
| 3 | `{{PATH_USERS_ROUTES}}` | `router.get('/:id', users.getById)` |
| 4 | `{{PATH_USERS_CONTROLLER}}` | `getById`: validates `:id`, calls the service, sends the response. |
| 5 | `{{PATH_USERS_SERVICE}}` | `getById()`: throws `NotFoundError` when there is no such user. |
{{/if}}
| 6 | `{{PATH_USERS_REPOSITORY}}` | The database query ({{ORM_NAME}}). |
| 7 | `{{PATH_USERS_ENTITY}}` | {{#if VIEWS}}The view (`views/`) turns the user into what the client may see{{else}}`toPublicUser()` – what the client may see{{/if}} (never the password hash). `sendSuccess()` wraps it in `{ success, message, data }`. |
{{else}}
| # | File | What happens |
| --- | --- | --- |
| 1 | `{{PATH_APP}}` | Middleware, validation pipe, exception filter and response interceptor for every request. |
| 2 | `{{PATH_APP_MODULE}}` | Global guards: {{#if SEC_RATE_LIMIT}}rate limit, {{/if}}{{#if AUTH}}JWT (sets the user – `@Public()` routes skip it), permissions (`@RequirePermissions`){{else}}none{{/if}}. |
{{#if AUTH}}
| 3 | `{{PATH_USERS_CONTROLLER}}` | `@Patch('me') updateProfile(@CurrentUser() user, @Body() dto: UpdateProfileDto)` – the DTO (`{{PATH_USERS_SCHEMAS}}`) is already validated. |
| 4 | `{{PATH_USERS_SERVICE}}` | `updateProfile()`: the business rules (a mobile number must be unique, a new number must be verified again…). |
{{else}}
| 3 | `{{PATH_USERS_CONTROLLER}}` | `@Get(':id') getById(@Param('id') id)` |
| 4 | `{{PATH_USERS_SERVICE}}` | `getById()`: throws `NotFoundError` when there is no such user. |
{{/if}}
| 5 | `{{PATH_USERS_REPOSITORY}}` | The database query ({{ORM_NAME}}). |
| 6 | `{{PATH_USERS_ENTITY}}` | {{#if VIEWS}}The view (`views/`) turns the user into what the client may see{{else}}`toPublicUser()` – what the client may see{{/if}} (never the password hash). The response interceptor wraps it in `{ success, message, data }`. |
{{/if}}

**Errors:** any error class from `{{PATH_ERRORS}}` (`NotFoundError`, `ConflictError`…) can be thrown anywhere. It becomes
`{ success: false, message, data: null, code, errors }` with the right HTTP status – no try/catch needed.

**Messages:** routes never write their own texts. Success and error messages are constants of the feature
(`{{PATH_USERS_MESSAGES}}`: `USERS_MESSAGES.profileUpdated`, `new NotFoundError(USERS_MESSAGES.notFound)`); the ones every
feature shares (validation, 401 / 403 / 404, rate limit…) are in `{{PATH_CORE_MESSAGES}}`.

**Where do the services come from?** `{{PATH_CONTAINER}}` creates every service once{{#if NEST}}; `{{PATH_CORE_MODULE}}` lets Nest inject
them into controllers (`constructor(private readonly users: UsersService)`){{else}}; `app.ts` hands them to the routes{{/if}}.
The tests build the same services with in-memory repositories, so they need no database.

## Add an endpoint

Example: `GET /api/v1/users/:id/stats`.

{{#if EXPRESS}}
1. **Input** – if it takes a body or query, add a zod schema to `{{PATH_USERS_SCHEMAS}}`.
2. **Logic** – add a method to `UsersService` (`{{PATH_USERS_SERVICE}}`). A new query goes into
   {{#if STRICT}}the repository interface (`{{PATH_USERS_CONTRACT}}`) and its {{ORM_NAME}} class (`{{PATH_USERS_REPOSITORY}}`){{else}}`{{PATH_USERS_REPOSITORY}}` (the interface at the top, the {{ORM_NAME}} class below){{/if}}.
3. **Controller** – add a method to `UsersController`:
   ```ts
   stats = async (req: Request, res: Response) => {
     const { id } = parseParams(idParams, req);
     sendSuccess(res, 'User stats', await this.users.stats(id));
   };
   ```
4. **Route** – one line in `{{PATH_USERS_ROUTES}}`: `router.get('/:id/stats', users.stats);`
{{#if SWAGGER}}
5. **Docs** – one entry in `{{PATH_USERS_DOCS}}`, so it shows up in Swagger.
{{/if}}
{{else}}
1. **Input** – if it takes a body or query, add a DTO class to `{{PATH_USERS_SCHEMAS}}` (class-validator decorators).
2. **Logic** – add a method to `UsersService` (`{{PATH_USERS_SERVICE}}`). A new query goes into
   {{#if STRICT}}the repository interface (`{{PATH_USERS_CONTRACT}}`) and its {{ORM_NAME}} class (`{{PATH_USERS_REPOSITORY}}`){{else}}`{{PATH_USERS_REPOSITORY}}` (the interface at the top, the {{ORM_NAME}} class below){{/if}}.
3. **Controller** – add a method to `UsersController`:
   ```ts
   @Get(':id/stats')
   @Endpoint({ summary: 'Statistics of a user', message: 'User stats' })
   stats(@Param('id') id: string) {
     return this.users.stats(id);
   }
   ```
{{/if}}
Then a test: `test/unit/users.spec.ts` (the service) and `test/e2e/users.e2e-spec.ts` (over HTTP).

## Add a feature

Example: `orders`.

1. **Entity** – `order.entity.ts` next to `{{PATH_USERS_ENTITY}}`.
2. **Database** – {{#if PRISMA}}a model in `prisma/schema.prisma`, then `npm run db:migrate -- --name orders`{{/if}}{{#if TYPEORM}}an entity class next to the others in the database folder, then `npm run db:migration:generate`{{/if}}{{#if MONGOOSE}}a Mongoose model next to the others in the database folder{{/if}}.
3. **Repository** – {{#if STRICT}}an interface (like `{{PATH_USERS_CONTRACT}}`) and its {{ORM_NAME}} class (like `{{PATH_USERS_REPOSITORY}}`){{else}}`orders.repository.ts` like `{{PATH_USERS_REPOSITORY}}`: the interface, then the {{ORM_NAME}} class{{/if}}; add it to `createRepositories()`.
4. **Service** – `orders.service.ts` like `{{PATH_USERS_SERVICE}}`; create it in `createServices()` (`{{PATH_CONTAINER}}`).
{{#if EXPRESS}}
5. **HTTP** – `orders.schemas.ts`, `orders.controller.ts`, `orders.routes.ts` (copy the users files), then one line in `{{PATH_ROUTES_INDEX}}`:
   `api.use('/orders', ordersRoutes(services));`{{#if SWAGGER}} Swagger: `orders.docs.ts` + one entry in `openapi.ts`.{{/if}}
{{else}}
5. **HTTP** – `orders.dto.ts` + `orders.controller.ts` (copy the users files); make the service injectable in `{{PATH_CORE_MODULE}}`
   (`service(OrdersService, 'orders')`) and {{#if FEATURE_MODULES}}add an `OrdersModule` (like `{{PATH_USERS_MODULE}}`) to `app.module.ts`{{else}}add the controller to `app.module.ts`{{/if}}.
{{/if}}
6. **Tests** – an in-memory repository in `test/support/in-memory-repositories.ts`, then unit + e2e tests.

{{/if}}
## Concepts

{{ARCHITECTURE_CONCEPTS}}

## Where does code belong?

{{ARCHITECTURE_RULES}}
{{#if STRICT}}

## Dependency rules

- The application layer (services) never imports {{FRAMEWORK_NAME}}, the ORM or HTTP types. It depends
  on **interfaces**: repository contracts and ports (password hasher, token service, mailer, health checks).
- Implementations of those interfaces live in the infrastructure / data layer and are wired in one place:
  the composition root (`{{PATH_CONTAINER}}`){{#if NEST}}, whose services Nest injects (`{{PATH_CORE_MODULE}}`){{/if}}.
- Tests replace the implementations with in-memory versions (`test/support`) – no database needed.
{{/if}}
