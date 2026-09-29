import { config } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:core.logger}}';
import { createDatabase } from '{{IMPORT:db.connection}}';
{{#if REDIS}}
import { closeRedis } from '{{IMPORT:db.redis}}';
{{/if}}
import { createInfrastructure, createServices } from '{{IMPORT:app.container}}';
{{#if SOCKET_SERVER}}
import { attachSocketServer, SocketHub } from '{{IMPORT:realtime.server}}';
{{/if}}
{{#if REPLICA}}
import { startEventHandlers } from '{{IMPORT:events.handlers}}';
{{/if}}
import { createApp } from '{{IMPORT:ex.app}}';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main(): Promise<void> {
  const database = createDatabase(config.database.url, logger);
  await database.connect();

  const infra = createInfrastructure(database);
  const services = createServices(infra);
{{#if REPLICA}}
  await startEventHandlers(infra, services, logger);
{{/if}}
  const server = createApp(services).listen(config.port, config.host, () => {
    logger.info(`{{DISPLAY_NAME}} API listening on http://${config.host}:${config.port}${config.api.basePath} (${config.env})`);
{{#if SWAGGER}}
    if (config.swagger.enabled) logger.info(`API docs: http://localhost:${config.port}/${config.api.prefix}/${config.swagger.path}`);
{{/if}}
  });
  // Slightly above typical load balancer idle timeouts.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
{{#if SOCKET_SERVER}}

  // Socket.IO on the same port (the app connects to the API origin).
  if (!(infra.realtime instanceof SocketHub)) throw new Error('Realtime must be the SocketHub');
  const io = attachSocketServer(server, infra.realtime, {
    authenticate: token => services.sessions.authenticate(token),
    users: infra.repositories.users,
{{#if CHAT}}
    isMember: (userId, conversationId) => services.chat.isMember(userId, conversationId),
    markRead: (userId, conversationId) => services.chat.markRead(userId, conversationId),
{{/if}}
    logger,
  });
{{/if}}

  // Socket.IO's close() also closes the HTTP server.
  const closeHttp = (done: (error?: Error) => void) => {{#if SOCKET_SERVER}}void io.close(done){{else}}server.close(done){{/if}};

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
    closeHttp(async error => {
      if (error) logger.error({ err: error }, 'Error while closing the HTTP server');
{{#if EVENTS}}
      await infra.eventBus.close();
{{/if}}
      await database.disconnect().catch(err => logger.error({ err }, 'Error while disconnecting the database'));
{{#if REDIS}}
      await closeRedis();
{{/if}}
      process.exit(error ? 1 : 0);
    });
    // Finish in-flight requests, drop idle keep-alive connections.
    server.closeIdleConnections();
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', reason => logger.error({ err: reason }, 'Unhandled promise rejection'));
  process.on('uncaughtException', error => {
    logger.fatal({ err: error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
}

try {
  await main();
} catch (error) {
  logger.fatal({ err: error }, 'Failed to start');
  process.exit(1);
}
