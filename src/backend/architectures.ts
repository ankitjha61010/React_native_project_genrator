import type { BackendArchitectureId, BackendFramework } from './types.js';

/** Business features every backend gets (auth only when authentication is enabled). */
export type BackendFeature = 'auth' | 'users' | 'health';

/**
 * Architectural layers. Every generated file belongs to exactly one layer; the
 * architecture decides where each layer lives (and, through `style`, which layers exist).
 */
export type BackendLayer =
  | 'bootstrap' // app.ts / server.ts / main.ts / container / app.module
  | 'config' // env schema + config module
  | 'core' // logger, errors, response envelope, pagination, crypto helpers
  | 'domain' // entities, roles & permissions (per feature)
  | 'repositoryContract' // repository interfaces (per feature)
  | 'repositoryImpl' // ORM repositories (per feature)
  | 'ports' // interfaces of external services (hashing, tokens, mail, health)
  | 'security' // password hashing + JWT implementations
  | 'mail' // mailer implementation
  | 'database' // connection, ORM entities / models, seed
  | 'application' // services or use-cases (per feature)
  | 'views' // response presenters (MVC)
  | 'httpKernel' // middleware / guards / filters / interceptors / decorators / pipes
  | 'http' // controllers (per feature)
  | 'routes' // Express routers (per feature)
  | 'dto' // request schemas (zod) / DTO classes (class-validator) + API docs (per feature)
  | 'module' // Nest modules + providers / Express module factories (per feature)
  | 'docs'; // OpenAPI / Swagger setup

export interface BackendArchitecture {
  id: BackendArchitectureId;
  name: string;
  summary: string;
  /** `service`: one service class per feature. `usecase`: one class per use-case (Clean / Enterprise). */
  style: 'service' | 'usecase';
  /** MVC: responses go through presenters in `views/`. */
  views: boolean;
  /** Nest: one module per feature (false = everything in AppModule, MVC). Express: module factories. */
  featureModules: boolean;
  /** Folder of a layer (relative to the project root). */
  dir(layer: BackendLayer, framework: BackendFramework, feature?: BackendFeature): string;
  /** Small tree shown before the user picks the architecture. */
  preview(framework: BackendFramework): string;
  /** Where things belong – rendered into docs/ARCHITECTURE.md. */
  rules: Array<{ question: string; answer: string }>;
  concepts: Array<{ title: string; body: string }>;
}

const need = (feature: BackendFeature | undefined, layer: string): BackendFeature => {
  if (!feature) throw new Error(`Layer "${layer}" needs a feature.`);
  return feature;
};

export const BACKEND_ARCHITECTURES: BackendArchitecture[] = [
  {
    id: 'feature-based',
    name: 'Feature-Based Architecture',
    summary: 'Code grouped by feature (auth, users…) with a small shared layer.',
    style: 'service',
    views: false,
    featureModules: true,
    dir(layer, fw, feature) {
      const f = (l: string) => `src/features/${need(feature, l)}`;
      switch (layer) {
        case 'bootstrap':
          return 'src';
        case 'config':
          return 'src/config';
        case 'core':
          return 'src/shared/core';
        case 'domain':
          return f(layer);
        case 'repositoryContract':
        case 'repositoryImpl':
          return `${f(layer)}/repositories`;
        case 'ports':
          return 'src/shared/ports';
        case 'security':
          return 'src/shared/security';
        case 'mail':
          return 'src/shared/mail';
        case 'database':
          return 'src/database';
        case 'application':
        case 'http':
        case 'routes':
        case 'module':
        case 'views':
          return f(layer);
        case 'dto':
          return fw === 'nestjs' ? `${f(layer)}/dto` : f(layer);
        case 'httpKernel':
          return fw === 'nestjs' ? 'src/shared/http' : 'src/shared/middleware';
        case 'docs':
          return 'src/docs';
      }
    },
    preview: fw => `src/
 ├── features/
 │    ├── auth/        ${fw === 'nestjs' ? 'auth.module · auth.controller · auth.service · dto/' : 'auth.routes · auth.controller · auth.service · auth.schemas'}
 │    ├── users/       … + repositories/
 │    └── health/
 ├── shared/           core (logger, errors, response) · security · ${fw === 'nestjs' ? 'http (guards, filters)' : 'middleware'}
 ├── database/         connection · seed
 ├── config/           env.ts (validated)
 └── ${fw === 'nestjs' ? 'main.ts · app.module.ts' : 'app.ts · server.ts · container.ts'}`,
    rules: [
      { question: 'Where does a new feature go?', answer: '`src/features/<feature>/` – controller, service, schemas/DTOs and repositories together.' },
      { question: 'Where does shared code go?', answer: '`src/shared/` – only code used by several features (logger, errors, security, HTTP helpers).' },
      { question: 'Where does data access go?', answer: 'An interface + an ORM implementation in `src/features/<feature>/repositories/`.' },
    ],
    concepts: [
      { title: 'Feature folders', body: 'Everything a feature needs lives in one folder, so a feature can be understood, changed or deleted in one place.' },
      { title: 'Repositories', body: 'Services depend on repository interfaces; the ORM implementation is injected, which keeps services testable with in-memory repositories.' },
    ],
  },
  {
    id: 'layered',
    name: 'Layered Architecture',
    summary: 'Horizontal layers: routes/controllers → services → repositories → database.',
    style: 'service',
    views: false,
    featureModules: true,
    dir(layer, fw) {
      switch (layer) {
        case 'bootstrap':
          return 'src';
        case 'config':
          return 'src/config';
        case 'core':
          return 'src/common';
        case 'domain':
          return 'src/models';
        case 'repositoryContract':
        case 'repositoryImpl':
          return 'src/repositories';
        case 'ports':
          return 'src/services/interfaces';
        case 'security':
          return 'src/services/security';
        case 'mail':
          return 'src/services/mail';
        case 'database':
          return 'src/database';
        case 'application':
          return 'src/services';
        case 'views':
          return 'src/views';
        case 'httpKernel':
          return fw === 'nestjs' ? 'src/common/http' : 'src/middlewares';
        case 'http':
          return 'src/controllers';
        case 'routes':
          return 'src/routes';
        case 'dto':
          return fw === 'nestjs' ? 'src/controllers/dto' : 'src/validators';
        case 'module':
          return 'src/modules';
        case 'docs':
          return 'src/docs';
      }
    },
    preview: fw => `src/
 ├── ${fw === 'nestjs' ? 'controllers/       HTTP layer (+ dto/)' : 'routes/            URL → controller\n ├── controllers/       HTTP layer (+ validators)'}
 ├── services/          business layer (auth, users, security, mail)
 ├── repositories/      data-access layer
 ├── models/            entities, roles & permissions
 ├── database/          connection · seed
 ├── ${fw === 'nestjs' ? 'modules/           Nest wiring per feature\n ├── common/            logger, errors, guards, filters' : 'middlewares/        auth, validation, errors, security\n ├── common/            logger, errors, response'}
 └── config/`,
    rules: [
      { question: 'Who may call whom?', answer: 'Only downwards: controllers → services → repositories. A layer never imports a layer above it.' },
      { question: 'Where do business rules go?', answer: '`src/services/` – never in controllers or repositories.' },
      { question: 'Where does SQL / ORM code go?', answer: '`src/repositories/` only.' },
    ],
    concepts: [
      { title: 'Strict layering', body: 'Each layer has one responsibility. Controllers translate HTTP, services hold the rules, repositories talk to the database.' },
      { title: 'Dependency direction', body: 'Services depend on repository interfaces (not on the ORM), so the data layer can be swapped or mocked.' },
    ],
  },
  {
    id: 'clean',
    name: 'Clean Architecture',
    summary: 'Domain & use-cases in the centre, frameworks and databases at the edge.',
    style: 'usecase',
    views: false,
    featureModules: true,
    dir(layer, fw, feature) {
      switch (layer) {
        case 'bootstrap':
          return 'src/main';
        case 'config':
          return 'src/infrastructure/config';
        case 'core':
          return 'src/shared';
        case 'domain':
          return 'src/domain/entities';
        case 'repositoryContract':
          return 'src/domain/repositories';
        case 'ports':
          return 'src/application/ports';
        case 'application':
          return `src/application/use-cases/${need(feature, layer)}`;
        case 'repositoryImpl':
          return 'src/infrastructure/repositories';
        case 'security':
          return 'src/infrastructure/security';
        case 'mail':
          return 'src/infrastructure/mail';
        case 'database':
          return 'src/infrastructure/database';
        case 'views':
          return 'src/presentation/http/presenters';
        case 'httpKernel':
          return fw === 'nestjs' ? 'src/presentation/http/common' : 'src/presentation/http/middlewares';
        case 'http':
        case 'routes':
          return `src/presentation/http/${need(feature, layer)}`;
        case 'dto':
          return `src/presentation/http/${need(feature, layer)}/${fw === 'nestjs' ? 'dto' : 'validators'}`;
        case 'module':
          return 'src/main/modules';
        case 'docs':
          return 'src/presentation/http/docs';
      }
    },
    preview: fw => `src/
 ├── domain/            entities · repository interfaces (no framework imports)
 ├── application/       use-cases/ (register, login, …) · ports/ (hasher, tokens, mail)
 ├── infrastructure/    database · repositories · security · mail · config
 ├── presentation/http/ ${fw === 'nestjs' ? 'controllers · DTOs · guards · filters' : 'routes · controllers · validators · middlewares'}
 └── main/              ${fw === 'nestjs' ? 'main.ts · app.module.ts · modules/ (wiring)' : 'app.ts · server.ts · container.ts (wiring)'}`,
    rules: [
      { question: 'What may the domain import?', answer: 'Nothing outside `src/domain` and `src/shared` – no framework, no ORM.' },
      { question: 'Where do business rules go?', answer: 'One use-case class per action in `src/application/use-cases/<feature>/`.' },
      { question: 'How does a use-case reach the database / JWT / email?', answer: 'Through interfaces (`domain/repositories`, `application/ports`) implemented in `src/infrastructure/`.' },
      { question: 'Where is everything wired together?', answer: '`src/main/` (the composition root) – the only place that knows every layer.' },
    ],
    concepts: [
      { title: 'Dependency rule', body: 'Source code dependencies point inwards: presentation → application → domain. Infrastructure implements interfaces defined by the inner layers.' },
      { title: 'Use-cases', body: 'Each user action (register, login, refresh…) is a small class with an `execute()` method – easy to find, test and change.' },
    ],
  },
  {
    id: 'mvc',
    name: 'MVC Architecture',
    summary: 'Models, Views (response presenters) and Controllers, with services for business logic.',
    style: 'service',
    views: true,
    featureModules: false,
    dir(layer, fw) {
      switch (layer) {
        case 'bootstrap':
          return 'src';
        case 'config':
          return 'src/config';
        case 'core':
          return 'src/lib';
        case 'domain':
        case 'repositoryContract':
        case 'repositoryImpl':
          return 'src/models';
        case 'ports':
          return 'src/services/interfaces';
        case 'security':
          return 'src/services/security';
        case 'mail':
          return 'src/services/mail';
        case 'database':
          return 'src/database';
        case 'application':
          return 'src/services';
        case 'views':
          return 'src/views';
        case 'httpKernel':
          return fw === 'nestjs' ? 'src/lib/http' : 'src/middlewares';
        case 'http':
          return 'src/controllers';
        case 'routes':
          return 'src/routes';
        case 'dto':
          return fw === 'nestjs' ? 'src/controllers/dto' : 'src/validators';
        case 'module':
          return 'src/providers';
        case 'docs':
          return 'src/docs';
      }
    },
    preview: fw => `src/
 ├── models/            entities + data access (repositories)
 ├── views/             response presenters (what the client sees)
 ├── controllers/       ${fw === 'nestjs' ? 'Nest controllers + DTOs' : 'request handlers + validators'}
 ├── services/          business logic · security · mail
${fw === 'nestjs' ? '' : ' ├── routes/            URL → controller\n'} ├── ${fw === 'nestjs' ? 'lib/               logger, errors, guards, filters' : 'middlewares/       auth, validation, errors, security\n ├── lib/               logger, errors, response'}
 ├── database/          connection · seed
 └── config/`,
    rules: [
      { question: 'Where does data access go?', answer: '`src/models/` – the model layer owns entities and their persistence.' },
      { question: 'What does the client receive?', answer: 'Whatever a presenter in `src/views/` returns – never a raw database record.' },
      { question: 'Where does business logic go?', answer: '`src/services/` – controllers stay thin.' },
    ],
    concepts: [
      { title: 'Views for an API', body: 'In an API the "view" is the JSON shape. Presenters in `views/` decide which fields leave the server (no password hashes, no internal flags).' },
      { title: 'Thin controllers', body: 'Controllers validate input, call a service and render a view.' },
    ],
  },
  {
    id: 'modular',
    name: 'Modular Architecture',
    summary: 'Self-contained modules with a public API, on top of a shared core.',
    style: 'service',
    views: false,
    featureModules: true,
    dir(layer, _fw, feature) {
      const m = (l: string) => `src/modules/${need(feature, l)}`;
      switch (layer) {
        case 'bootstrap':
          return 'src';
        case 'config':
          return 'src/core/config';
        case 'core':
          return 'src/core/lib';
        case 'domain':
          return `${m(layer)}/domain`;
        case 'repositoryContract':
        case 'repositoryImpl':
          return `${m(layer)}/data`;
        case 'ports':
          return 'src/core/ports';
        case 'security':
          return 'src/core/security';
        case 'mail':
          return 'src/core/mail';
        case 'database':
          return 'src/core/database';
        case 'application':
        case 'http':
        case 'routes':
        case 'module':
        case 'views':
          return m(layer);
        case 'dto':
          return `${m(layer)}/dto`;
        case 'httpKernel':
          return 'src/core/http';
        case 'docs':
          return 'src/core/docs';
      }
    },
    preview: fw => `src/
 ├── modules/
 │    ├── auth/        ${fw === 'nestjs' ? 'auth.module (public API) · controller · service · data/' : 'index.ts (createAuthModule – public API) · routes · controller · service · data/'}
 │    ├── users/       domain/ · data/ · …
 │    └── health/
 ├── core/             config · database · security · mail · http · lib (logger, errors)
 └── ${fw === 'nestjs' ? 'main.ts · app.module.ts' : 'app.ts · server.ts · container.ts'}`,
    rules: [
      { question: 'How do modules talk to each other?', answer: 'Through their public API only: domain types + repository contracts, and what the module exports (Nest module `exports` / the factory in `index.ts`). Never import another module’s services, controllers or data files.' },
      { question: 'Where does a new module go?', answer: '`src/modules/<name>/` with its own domain, data and HTTP files.' },
      { question: 'What goes into core?', answer: 'Infrastructure every module needs: config, database, security, mail, logging, HTTP kernel.' },
    ],
    concepts: [
      { title: 'Module boundaries', body: 'A module hides its internals and exposes a small public API, so modules can later be extracted into separate services.' },
      { title: 'Shared core', body: 'Cross-cutting infrastructure lives once in `src/core` and is injected into modules.' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Architecture',
    summary: 'Bounded-context modules, each with domain / application / infrastructure / presentation layers.',
    style: 'usecase',
    views: false,
    featureModules: true,
    dir(layer, _fw, feature) {
      const m = (l: string) => `src/modules/${need(feature, l)}`;
      switch (layer) {
        case 'bootstrap':
          return 'src/bootstrap';
        case 'config':
          return 'src/core/config';
        case 'core':
          return 'src/core/kernel';
        case 'domain':
          return `${m(layer)}/domain/entities`;
        case 'repositoryContract':
          return `${m(layer)}/domain/repositories`;
        case 'application':
          return `${m(layer)}/application/use-cases`;
        case 'repositoryImpl':
          return `${m(layer)}/infrastructure/persistence`;
        case 'http':
        case 'routes':
          return `${m(layer)}/presentation/http`;
        case 'dto':
          return `${m(layer)}/presentation/http/dto`;
        case 'views':
          return `${m(layer)}/presentation/presenters`;
        case 'module':
          return m(layer);
        case 'ports':
          return 'src/shared/application/ports';
        case 'security':
          return 'src/shared/infrastructure/security';
        case 'mail':
          return 'src/shared/infrastructure/mail';
        case 'database':
          return 'src/shared/infrastructure/database';
        case 'httpKernel':
          return 'src/core/http';
        case 'docs':
          return 'src/core/docs';
      }
    },
    preview: fw => `src/
 ├── modules/                  bounded contexts
 │    ├── auth/
 │    │    ├── domain/         entities · repository interfaces
 │    │    ├── application/    use-cases
 │    │    ├── infrastructure/ persistence (ORM repositories)
 │    │    └── presentation/   ${fw === 'nestjs' ? 'controllers · DTOs' : 'routes · controllers · validators'}
 │    └── users/ …
 ├── shared/                   ports · security · mail · database (shared kernel)
 ├── core/                     config · kernel (logger, errors) · http · docs
 └── bootstrap/                ${fw === 'nestjs' ? 'main.ts · app.module.ts' : 'app.ts · server.ts · container.ts'}`,
    rules: [
      { question: 'Where does a new business area go?', answer: 'A new bounded context in `src/modules/<context>/` with its own four layers.' },
      { question: 'What may a module’s domain import?', answer: 'Only its own domain and `src/core/kernel` – no framework, ORM or other modules.' },
      { question: 'Where are shared technical services?', answer: 'Interfaces in `src/shared/application/ports`, implementations in `src/shared/infrastructure`.' },
    ],
    concepts: [
      { title: 'Bounded contexts', body: 'Each module owns its model and data. Teams can work on contexts independently.' },
      { title: 'Clean layers per module', body: 'Inside a module the Clean Architecture dependency rule applies: presentation → application → domain, infrastructure implements the interfaces.' },
    ],
  },
];

export function getBackendArchitecture(id: BackendArchitectureId): BackendArchitecture {
  const arch = BACKEND_ARCHITECTURES.find(a => a.id === id);
  if (!arch) throw new Error(`Unknown backend architecture "${id}".`);
  return arch;
}
