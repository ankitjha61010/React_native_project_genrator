import { Global, Inject, Injectable, Module, {{#if SOCKET_SERVER}}type BeforeApplicationShutdown, {{/if}}type OnApplicationShutdown, type Provider } from '@nestjs/common';
import { config } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:core.logger}}';
import { createDatabase, type Database } from '{{IMPORT:db.connection}}';
{{#if SOCKET_SERVER}}
import { SocketHub } from '{{IMPORT:realtime.server}}';
{{/if}}
{{#if AUTH_API}}
import { AuthService } from '{{IMPORT:app.authService}}';
{{/if}}
{{#if CHAT}}
import { ChatService } from '{{IMPORT:app.chatService}}';
{{/if}}
import { createInfrastructure, createServices, {{#if INFRA_LIFECYCLE}}type Infrastructure, {{/if}}type Services } from '{{IMPORT:app.container}}';
import { HealthService } from '{{IMPORT:app.healthService}}';
{{#if NOTIFICATIONS}}
import { NotificationsService } from '{{IMPORT:app.notificationsService}}';
{{/if}}
{{#if USERS_API}}
import { UsersService } from '{{IMPORT:app.usersService}}';
{{/if}}
import { DATABASE, INFRASTRUCTURE, SERVICES } from '{{IMPORT:nest.tokens}}';

/** Closes {{#if SOCKET_SERVER}}Socket.IO, {{/if}}{{#if EVENTS}}the event bus, {{/if}}the database when the app shuts down (SIGTERM / app.close()). */
@Injectable()
class Lifecycle implements {{#if SOCKET_SERVER}}BeforeApplicationShutdown, {{/if}}OnApplicationShutdown {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
{{#if INFRA_LIFECYCLE}}
    @Inject(INFRASTRUCTURE) private readonly infra: Infrastructure,
{{/if}}
  ) {}
{{#if SOCKET_SERVER}}

  async beforeApplicationShutdown(): Promise<void> {
    if (this.infra.realtime instanceof SocketHub) await this.infra.realtime.close();
  }
{{/if}}

  async onApplicationShutdown(): Promise<void> {
{{#if EVENTS}}
    await this.infra.eventBus.close();
{{/if}}
    await this.database.disconnect();
  }
}

/** Makes each service injectable by its class (`constructor(private readonly auth: AuthService)`). */
const service = <K extends keyof Services>(token: abstract new (...args: never[]) => Services[K], key: K): Provider => ({
  provide: token,
  useFactory: (services: Services) => services[key],
  inject: [SERVICES],
});

const SERVICE_PROVIDERS: Provider[] = [
{{#if AUTH_API}}
  service(AuthService, 'auth'),
{{/if}}
{{#if USERS_API}}
  service(UsersService, 'users'),
{{/if}}
  service(HealthService, 'health'),
{{#if CHAT}}
  service(ChatService, 'chat'),
{{/if}}
{{#if NOTIFICATIONS}}
  service(NotificationsService, 'notifications'),
{{/if}}
];

/**
 * The application core, available everywhere: database → infrastructure → services, built by
 * the same composition root as the tests (container.ts). Feature modules only add controllers.
 */
@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: async (): Promise<Database> => {
        const database = createDatabase(config.database.url, logger);
        await database.connect();
        return database;
      },
    },
    { provide: INFRASTRUCTURE, useFactory: createInfrastructure, inject: [DATABASE] },
    { provide: SERVICES, useFactory: createServices, inject: [INFRASTRUCTURE] },
    ...SERVICE_PROVIDERS,
    Lifecycle,
  ],
  exports: [DATABASE, INFRASTRUCTURE, SERVICES, ...SERVICE_PROVIDERS],
})
export class CoreModule {}
