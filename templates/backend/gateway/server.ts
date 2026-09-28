import { config, createGateway, logger } from './gateway.js';

const server = createGateway();
server.listen(config.port, config.host, () => {
  logger.info(`API gateway on http://${config.host}:${config.port}/api/v1 → ${JSON.stringify(config.services)}`);
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down');
  server.close(() => process.exit(0));
  server.closeAllConnections();
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
