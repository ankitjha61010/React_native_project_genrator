import type { BackendArchitectureId, BackendFramework } from './types.js';

/** Business features every backend gets (auth only when authentication is enabled). */
export type BackendFeature = 'auth' | 'users' | 'health' | 'chat' | 'devices' | 'notifications' | 'calling' | 'legal' | 'ota' | 'payments';

/**
 * Architectural layers. Every generated file belongs to exactly one layer; the
 * architecture decides where each layer lives.
 */
export type BackendLayer =
  | 'bootstrap' // app.ts / server.ts / main.ts / container / app.module
  | 'config' // env schema + config module
  | 'core' // logger, errors, response envelope, pagination, crypto helpers
  | 'domain' // entities, roles & permissions (per feature)
  | 'repositoryContract' // repository interfaces (per feature)
  | 'repositoryImpl' // ORM repositories (per feature)
  | 'ports' // interfaces of external services (hashing, tokens, mail, SMS, push, storage, realtime…)
  | 'security' // password hashing + JWT implementations
  | 'adapters' // external providers: mail, SMS, push, file storage
  | 'realtime' // Socket.IO server
  | 'database' // connection, ORM entities / models, seed
  | 'application' // one service per feature
  | 'views' // response presenters (MVC)
  | 'httpKernel' // middleware / guards / filters / interceptors / decorators / pipes
  | 'http' // controllers (per feature)
  | 'routes' // Express routers (per feature)
  | 'dto' // request schemas (zod) / DTO classes (class-validator) + API docs (per feature)
  | 'module' // Nest modules + providers / Express module factories (per feature)
  | 'messages' // response / error messages of a feature (per feature)
  | 'model' // ORM models / entities (per feature)
  | 'docs'; // OpenAPI / Swagger setup (+ per-feature docs)

export interface BackendArchitecture {
  id: BackendArchitectureId;
  name: string;
  summary: string;
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
          return f(layer);
        case 'ports':
          return 'src/shared/ports';
        case 'security':
          return 'src/shared/security';
        case 'adapters':
          return 'src/shared/adapters';
        case 'realtime':
          return 'src/shared/realtime';
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
        case 'messages':
        case 'model':
          return f(layer);
        case 'docs':
          return feature ? f(layer) : 'src/docs';
      }
    },
    preview: fw => `src/
 ├── features/
 │    ├── auth/        ${fw === 'nestjs' ? 'auth.module · auth.controller · auth.service · dto/' : 'auth.routes · auth.controller · auth.service · auth.schemas'}
 │    ├── users/       … + users.repository · user.model · users.messages
 │    └── health/
 ├── shared/           core (logger, errors, response) · security · ${fw === 'nestjs' ? 'http (guards, filters)' : 'middleware'}
 ├── database/         connection · seed
 ├── config/           env.ts (validated)
 └── ${fw === 'nestjs' ? 'main.ts · app.module.ts' : 'app.ts · server.ts · container.ts'}`,
    rules: [
      { question: 'Where does a new feature go?', answer: '`src/features/<feature>/` – controller, service, schemas/DTOs and repositories together.' },
      { question: 'Where does shared code go?', answer: '`src/shared/` – only code used by several features (logger, errors, security, HTTP helpers).' },
      { question: 'Where does data access go?', answer: '`src/features/<feature>/<feature>.repository.ts` (the interface and its ORM class in one file) and the ORM model next to it.' },
      { question: 'Where are the texts the API sends?', answer: '`src/features/<feature>/<feature>.messages.ts` (shared ones: `src/shared/core/messages.ts`).' },
    ],
    concepts: [
      { title: 'Feature folders', body: 'Everything a feature needs lives in one folder, so a feature can be understood, changed or deleted in one place.' },
      { title: 'Repositories', body: 'Services never call the ORM directly – they call a repository. Its interface sits right above the ORM class in the same file; the tests pass in-memory repositories instead.' },
    ],
  },
  {
    id: 'layered',
    name: 'Layered Architecture',
    summary: 'Horizontal layers: routes/controllers → services → repositories → database.',
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
        case 'adapters':
          return 'src/services/adapters';
        case 'realtime':
          return 'src/services/realtime';
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
        case 'messages':
          return 'src/constants';
        case 'model':
          return 'src/database/models';
        case 'docs':
          return 'src/docs';
      }
    },
    preview: fw => `src/
 ├── ${fw === 'nestjs' ? 'controllers/       HTTP layer (+ dto/)' : 'routes/            URL → controller method (one file per feature)\n ├── controllers/       read the request, call a service, send the response\n ├── validators/        request schemas (zod)'}
 ├── services/          business layer (auth, users, …) · security · adapters (mail, SMS, push, storage)
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
      { title: 'Dependency direction', body: 'Services use repository interfaces (not the ORM), so the tests can run on in-memory repositories. Each interface lives in the same file as its ORM class.' },
    ],
  },
  {
    id: 'clean',
    name: 'Clean Architecture',
    summary: 'Domain & application services in the centre, frameworks and databases at the edge.',
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
          return `src/application/services`;
        case 'repositoryImpl':
          return 'src/infrastructure/repositories';
        case 'security':
          return 'src/infrastructure/security';
        case 'adapters':
          return 'src/infrastructure/adapters';
        case 'realtime':
          return 'src/infrastructure/realtime';
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
        case 'messages':
          return 'src/application/messages';
        case 'model':
          return 'src/infrastructure/database/models';
        case 'docs':
          return 'src/presentation/http/docs';
      }
    },
    preview: fw => `src/
 ├── domain/            entities · repository interfaces (no framework imports)
 ├── application/       services/ (auth, users, …) · ports/ (hasher, tokens, mail, push…)
 ├── infrastructure/    database · repositories · security · adapters · realtime · config
 ├── presentation/http/ ${fw === 'nestjs' ? 'controllers · DTOs · guards · filters' : 'routes · controllers · validators · middlewares'}
 └── main/              ${fw === 'nestjs' ? 'main.ts · app.module.ts · modules/ (wiring)' : 'app.ts · server.ts · container.ts (wiring)'}`,
    rules: [
      { question: 'What may the domain import?', answer: 'Nothing outside `src/domain` and `src/shared` – no framework, no ORM.' },
      { question: 'Where do business rules go?', answer: 'One application service per feature in `src/application/services/` – no framework, ORM or HTTP types.' },
      { question: 'How does a service reach the database / JWT / email?', answer: 'Through interfaces (`domain/repositories`, `application/ports`) implemented in `src/infrastructure/`.' },
      { question: 'Where is everything wired together?', answer: '`src/main/` (the composition root) – the only place that knows every layer.' },
    ],
    concepts: [
      { title: 'Dependency rule', body: 'Source code dependencies point inwards: presentation → application → domain. Infrastructure implements interfaces defined by the inner layers.' },
      { title: 'Application services', body: 'One service per feature holds the use cases of that feature as methods (register, login, refresh…). It only depends on domain types and interfaces.' },
    ],
  },
  {
    id: 'mvc',
    name: 'MVC Architecture',
    summary: 'Models, Views (response presenters) and Controllers, with services for business logic.',
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
        case 'adapters':
          return 'src/services/adapters';
        case 'realtime':
          return 'src/services/realtime';
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
        case 'messages':
          return 'src/constants';
        case 'model':
          return 'src/models';
        case 'docs':
          return 'src/docs';
      }
    },
    preview: fw => `src/
 ├── models/            entities + data access (repositories)
 ├── views/             response presenters (what the client sees)
 ├── controllers/       ${fw === 'nestjs' ? 'Nest controllers + DTOs' : 'request handlers (req → service → view)\n ├── validators/        request schemas (zod)'}
 ├── services/          business logic · security · adapters (mail, SMS, push, storage)
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
        case 'adapters':
          return 'src/core/adapters';
        case 'realtime':
          return 'src/core/realtime';
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
        case 'messages':
          return m(layer);
        case 'model':
          return `${m(layer)}/data`;
        case 'docs':
          return feature ? m(layer) : 'src/core/docs';
      }
    },
    preview: fw => `src/
 ├── modules/
 │    ├── auth/        ${fw === 'nestjs' ? 'auth.module (public API) · controller · service · data/' : 'auth.routes · auth.controller · auth.service · dto/ · data/'}
 │    ├── users/       domain/ · data/ · …
 │    └── health/
 ├── core/             config · database · security · adapters · realtime · http · lib
 └── ${fw === 'nestjs' ? 'main.ts · app.module.ts' : 'app.ts · server.ts · container.ts'}`,
    rules: [
      { question: 'How do modules talk to each other?', answer: 'Through their public API only: domain types, repository interfaces and services (Nest: what a module `exports`; Express: the services container.ts passes to the routes). Never import another module’s controllers or data files.' },
      { question: 'Where does a new module go?', answer: '`src/modules/<name>/` with its own domain, data and HTTP files.' },
      { question: 'What goes into core?', answer: 'Infrastructure every module needs: config, database, security, adapters (mail, SMS, push, storage), realtime, logging, HTTP kernel.' },
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
          return `${m(layer)}/application`;
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
        case 'adapters':
          return 'src/shared/infrastructure/adapters';
        case 'realtime':
          return 'src/shared/infrastructure/realtime';
        case 'database':
          return 'src/shared/infrastructure/database';
        case 'httpKernel':
          return 'src/core/http';
        case 'messages':
          return `${m(layer)}/application`;
        case 'model':
          return `${m(layer)}/infrastructure/persistence`;
        case 'docs':
          return feature ? `${m(layer)}/presentation/http` : 'src/core/docs';
      }
    },
    preview: fw => `src/
 ├── modules/                  bounded contexts
 │    ├── auth/
 │    │    ├── domain/         entities · repository interfaces
 │    │    ├── application/    <module>.service
 │    │    ├── infrastructure/ persistence (ORM repositories)
 │    │    └── presentation/   ${fw === 'nestjs' ? 'controllers · DTOs' : 'routes · controllers · validators'}
 │    └── users/ …
 ├── shared/                   ports · security · adapters · realtime · database (shared kernel)
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
