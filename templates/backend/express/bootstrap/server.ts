import { config } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:core.logger}}';
import { createDatabase } from '{{IMPORT:db.connection}}';
import { createApp } from '{{IMPORT:ex.app}}';
import { createContainer, createInfrastructure } from '{{IMPORT:ex.container}}';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main(): Promise<void> {
  const database = createDatabase(config.database.url, logger);
  await database.connect();

  const app = createApp(createContainer(createInfrastructure(database)));
  const server = app.listen(config.port, config.host, () => {
    logger.info(`{{DISPLAY_NAME}} API listening on http://${config.host}:${config.port}${config.api.basePath} (${config.env})`);
{{#if SWAGGER}}
    if (config.swagger.enabled) logger.info(`API docs: http://localhost:${config.port}/${config.api.prefix}/${config.swagger.path}`);
{{/if}}
  });
  // Slightly above typical load balancer idle timeouts.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    server.close(async error => {
      if (error) logger.error({ err: error }, 'Error while closing the HTTP server');
      await database.disconnect().catch(err => logger.error({ err }, 'Error while disconnecting the database'));
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
