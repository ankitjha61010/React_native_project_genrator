{{#if EXPRESS}}
import type { Server } from 'node:http';
{{#if AUTH}}
import { config } from '{{IMPORT:config.env}}';
import { createPasswordHasher } from '{{IMPORT:impl.passwordHasher}}';
import { JwtTokenService } from '{{IMPORT:impl.tokenService}}';
{{/if}}
import { createApp } from '{{IMPORT:ex.app}}';
import { createContainer } from '{{IMPORT:ex.container}}';
{{/if}}
{{#if NEST}}
import type { Server } from 'node:http';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '{{IMPORT:nest.appModule}}';
import { configureApp } from '{{IMPORT:nest.setup}}';
import {
  DATABASE,
{{#if AUTH}}
  MAILER,
{{/if}}
{{#if AUTH_REFRESH}}
  REFRESH_TOKENS_REPOSITORY,
{{/if}}
{{#if AUTH}}
  USER_TOKENS_REPOSITORY,
{{/if}}
  USERS_REPOSITORY,
} from '{{IMPORT:nest.tokens}}';
{{/if}}
{{#if AUTH}}
import { FakeHealthCheck, FakeMailer } from './fakes.js';
{{else}}
import { FakeHealthCheck } from './fakes.js';
{{/if}}
import {
{{#if AUTH_REFRESH}}
  InMemoryRefreshTokensRepository,
{{/if}}
{{#if AUTH}}
  InMemoryUserTokensRepository,
{{/if}}
  InMemoryUsersRepository,
} from './in-memory-repositories.js';

export interface TestApp {
  /** Pass to supertest: `request(app.server)`. */
  server: Server;
  usersRepository: InMemoryUsersRepository;
{{#if AUTH}}
  mailer: FakeMailer;
{{/if}}
  health: FakeHealthCheck;
  close(): Promise<void>;
}

/** The real HTTP app (middleware, validation, errors…) on in-memory infrastructure. */
export async function createTestApp(): Promise<TestApp> {
  const usersRepository = new InMemoryUsersRepository();
{{#if AUTH}}
  const mailer = new FakeMailer();
{{/if}}
  const health = new FakeHealthCheck();
{{#if EXPRESS}}

  const app = createApp(
    createContainer({
      usersRepository,
{{#if AUTH}}
{{#if AUTH_REFRESH}}
      refreshTokensRepository: new InMemoryRefreshTokensRepository(),
{{/if}}
      userTokensRepository: new InMemoryUserTokensRepository(),
{{#if HASH_ARGON2}}
      passwordHasher: createPasswordHasher(),
{{else}}
      passwordHasher: createPasswordHasher(config.password),
{{/if}}
      tokenService: new JwtTokenService(config.jwt),
      mailer,
{{/if}}
      healthChecks: [health],
    }),
  );
  const server = await new Promise<Server>(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const close = () => new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
{{/if}}
{{#if NEST}}

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATABASE)
    .useValue({ healthCheck: health, connect: async () => {}, disconnect: async () => {} })
    .overrideProvider(USERS_REPOSITORY)
    .useValue(usersRepository)
{{#if AUTH_REFRESH}}
    .overrideProvider(REFRESH_TOKENS_REPOSITORY)
    .useValue(new InMemoryRefreshTokensRepository())
{{/if}}
{{#if AUTH}}
    .overrideProvider(USER_TOKENS_REPOSITORY)
    .useValue(new InMemoryUserTokensRepository())
    .overrideProvider(MAILER)
    .useValue(mailer)
{{/if}}
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: false });
  configureApp(app);
  await app.init();
  const server: Server = app.getHttpServer();
  const close = () => app.close();
{{/if}}

  return { server, usersRepository, {{#if AUTH}}mailer, {{/if}}health, close };
}
