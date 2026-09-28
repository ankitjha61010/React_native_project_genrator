# Architecture – {{ARCHITECTURE_NAME}}

{{ARCHITECTURE_SUMMARY}}

```
{{ARCHITECTURE_TREE}}
```

## Concepts

{{ARCHITECTURE_CONCEPTS}}

## Where does code belong?

{{ARCHITECTURE_RULES}}

## Request flow

```
HTTP request
  → {{#if NEST}}middleware (request log{{#if SEC_SANITIZE}}, sanitize{{/if}}) → guards ({{#if SEC_ANY_RATE_LIMIT}}rate limit, {{/if}}{{#if AUTH}}JWT, roles/permissions{{else}}–{{/if}}) → ValidationPipe (DTO){{else}}middleware (request log, security headers{{#if SEC_ANY_RATE_LIMIT}}, rate limit{{/if}}{{#if SEC_SANITIZE}}, sanitize{{/if}}{{#if AUTH}}, authenticate, authorize{{/if}}){{/if}}
  → controller           translates HTTP ⇄ application calls, validates input
  → {{#if STYLE_USECASE}}use-case{{else}}service{{/if}}              business rules (framework independent)
  → repository interface → {{ORM_NAME}} repository → {{DATABASE_LABEL}}
  ← {{#if VIEWS}}view (presenter)     shapes the output{{else}}public mapping       strips internal fields{{/if}}
  ← {{#if NEST}}response interceptor{{else}}respond()        {{/if}}   wraps it in { success, message, data, meta }
Errors anywhere → AppError → {{#if NEST}}exception filter{{else}}error middleware{{/if}} → { success: false, message, code, errors }
```

## Dependency rules

- The application layer ({{#if STYLE_USECASE}}use-cases{{else}}services{{/if}}) never imports {{FRAMEWORK_NAME}}, the ORM or HTTP types. It depends
  on **interfaces**: repository contracts and ports (password hasher, token service, mailer, health checks).
- Implementations of those interfaces live in the infrastructure / data layer and are wired in one place:
  {{#if NEST}}Nest providers (`*.providers.ts`, `useFactory`){{else}}the composition root (`container.ts`){{/if}}.
- Tests replace the implementations with in-memory versions (`test/support`) – no database needed.

## Adding a feature

1. Domain: entity + repository interface.
2. Data: implement the repository with {{ORM_NAME}}{{#if PRISMA}} (add the model to `prisma/schema.prisma`, `npm run db:migrate -- --name <feature>`){{/if}}{{#if TYPEORM}} (entity + `npm run db:migration:generate`){{/if}}{{#if MONGOOSE}} (model){{/if}}.
3. Application: {{#if STYLE_USECASE}}one use-case class per action{{else}}a service{{/if}} depending on the interface.
4. HTTP: {{#if NEST}}DTOs + controller, register providers in the feature's `*.providers.ts`{{#if FEATURE_MODULES}} and module{{/if}}{{else}}schemas + controller + router, wire it in `container.ts` and `app.ts`{{/if}}.
5. Tests: a unit test with in-memory repositories and an e2e test.
