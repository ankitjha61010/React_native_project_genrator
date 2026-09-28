import type { LoggerService } from '@nestjs/common';
import { logger } from '{{IMPORT:core.logger}}';

/** Routes Nest's own logs (bootstrap, route mapping…) through the application logger. */
export class AppLogger implements LoggerService {
  log(message: unknown, ...params: unknown[]) {
    logger.info(this.meta(params), String(message));
  }

  error(message: unknown, ...params: unknown[]) {
    logger.error(this.meta(params), String(message));
  }

  warn(message: unknown, ...params: unknown[]) {
    logger.warn(this.meta(params), String(message));
  }

  debug(message: unknown, ...params: unknown[]) {
    logger.debug(this.meta(params), String(message));
  }

  verbose(message: unknown, ...params: unknown[]) {
    logger.trace(this.meta(params), String(message));
  }

  fatal(message: unknown, ...params: unknown[]) {
    logger.fatal(this.meta(params), String(message));
  }

  /** Nest passes the context (class name) as the last parameter. */
  private meta(params: unknown[]): Record<string, unknown> {
    const context = params.at(-1);
    return typeof context === 'string' ? { context } : {};
  }
}
