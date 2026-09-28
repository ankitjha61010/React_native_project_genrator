import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { config } from '{{IMPORT:config.env}}';
import { AppLogger } from '{{IMPORT:nest.logger}}';
import { logger } from '{{IMPORT:core.logger}}';
import { AppModule } from '{{IMPORT:nest.appModule}}';
import { configureApp } from '{{IMPORT:nest.setup}}';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false, logger: new AppLogger() });
  configureApp(app);
  // Closes the HTTP server and the database on SIGTERM / SIGINT.
  app.enableShutdownHooks();

  const server = await app.listen(config.port, config.host);
  // Slightly above typical load balancer idle timeouts.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  logger.info(`{{DISPLAY_NAME}} API listening on http://${config.host}:${config.port}${config.api.basePath} (${config.env})`);
{{#if SWAGGER}}
  if (config.swagger.enabled) logger.info(`API docs: http://localhost:${config.port}/${config.api.prefix}/${config.swagger.path}`);
{{/if}}
}

process.on('unhandledRejection', reason => logger.error({ err: reason }, 'Unhandled promise rejection'));

try {
  await bootstrap();
} catch (error) {
  logger.fatal({ err: error }, 'Failed to start');
  process.exit(1);
}
