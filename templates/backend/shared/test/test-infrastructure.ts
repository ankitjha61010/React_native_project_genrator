{{#if AUTH}}
import { config } from '{{IMPORT:config.env}}';
import { JwtTokenService } from '{{IMPORT:impl.tokenService}}';
{{/if}}
{{#if AUTH_EMAIL}}
import { createPasswordHasher } from '{{IMPORT:impl.passwordHasher}}';
{{/if}}
import { createServices, type Infrastructure } from '{{IMPORT:app.container}}';
{{#if SVC_IDENTITY}}
import { logger } from '{{IMPORT:core.logger}}';
import { PublishingUsersRepository } from '{{IMPORT:events.usersPublisher}}';
{{/if}}
import {
{{#if EVENTS}}
  FakeEventBus,
{{/if}}
  FakeHealthCheck,
{{#if AUTH_EMAIL}}
  FakeMailer,
{{/if}}
{{#if IAP_ADAPTY}}
  FakeAdaptyClient,
{{/if}}
{{#if GATEWAY}}
  FakePaymentGateway,
{{/if}}
{{#if NOTIFICATIONS}}
  FakePushSender,
{{/if}}
{{#if REALTIME}}
  FakeRealtime,
{{/if}}
{{#if AUTH_OTP}}
  FakeSms,
{{/if}}
{{#if SOCIAL}}
  FakeSocialVerifier,
{{/if}}
{{#if IAP_NATIVE}}
  FakeStorePurchaseVerifier,
{{/if}}
{{#if UPLOADS}}
  FakeStorage,
{{/if}}
} from './fakes.js';
import { createInMemoryRepositories } from './in-memory-repositories.js';

/**
 * The whole application on in-memory infrastructure: real services, fake outside world.
 * Every fake is returned too, so tests can read sent codes, pushes, socket events…
 */
export function createTestInfrastructure() {
  const fakes = {
    repositories: createInMemoryRepositories(),
    healthCheck: new FakeHealthCheck(),
{{#if AUTH_EMAIL}}
    mailer: new FakeMailer(),
{{/if}}
{{#if AUTH_OTP}}
    sms: new FakeSms(),
{{/if}}
{{#if SOCIAL}}
    socialVerifier: new FakeSocialVerifier(),
{{/if}}
{{#if UPLOADS}}
    storage: new FakeStorage(),
{{/if}}
{{#if NOTIFICATIONS}}
    pushSender: new FakePushSender(),
{{/if}}
{{#if REALTIME}}
    realtime: new FakeRealtime(),
{{/if}}
{{#if EVENTS}}
    eventBus: new FakeEventBus(),
{{/if}}
{{#if GATEWAY}}
    paymentGateway: new FakePaymentGateway(),
{{/if}}
{{#if IAP_NATIVE}}
    storeVerifier: new FakeStorePurchaseVerifier(),
{{/if}}
{{#if IAP_ADAPTY}}
    adapty: new FakeAdaptyClient(),
{{/if}}
  };

  const infra: Infrastructure = {
{{#if SVC_IDENTITY}}
    // Like the real identity service: changes made through the services are published.
    repositories: { ...fakes.repositories, users: new PublishingUsersRepository(fakes.repositories.users, fakes.eventBus, logger) },
{{else}}
    repositories: fakes.repositories,
{{/if}}
    healthChecks: [fakes.healthCheck],
{{#if AUTH}}
    tokenService: new JwtTokenService(config.jwt),
{{/if}}
{{#if UPLOADS}}
    storage: fakes.storage,
{{/if}}
{{#if AUTH_EMAIL}}
{{#if HASH_ARGON2}}
    passwordHasher: createPasswordHasher(),
{{else}}
    passwordHasher: createPasswordHasher(config.password),
{{/if}}
    mailer: fakes.mailer,
{{/if}}
{{#if AUTH_OTP}}
    sms: fakes.sms,
{{/if}}
{{#if SOCIAL}}
    socialVerifier: fakes.socialVerifier,
{{/if}}
{{#if NOTIFICATIONS}}
    pushSender: fakes.pushSender,
{{/if}}
{{#if REALTIME}}
    realtime: fakes.realtime,
{{/if}}
{{#if EVENTS}}
    eventBus: fakes.eventBus,
{{/if}}
{{#if GATEWAY}}
    paymentGateway: fakes.paymentGateway,
{{/if}}
{{#if IAP_NATIVE}}
    storeVerifier: fakes.storeVerifier,
{{/if}}
{{#if IAP_ADAPTY}}
    adapty: fakes.adapty,
{{/if}}
  };
  return { infra, ...fakes };
}

/** Services + fakes for unit tests. */
export function createHarness() {
  const test = createTestInfrastructure();
  return { ...test, ...createServices(test.infra) };
}

export type Harness = ReturnType<typeof createHarness>;
