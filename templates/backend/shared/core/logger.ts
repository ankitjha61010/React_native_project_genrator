import { pino } from 'pino';
import { config } from '{{IMPORT:config.env}}';

/**
 * Application logger (pino, JSON in production, pretty in development). Use it instead of
 * `console.*`. Secrets are redacted before anything is written.
 */
export const logger = pino({
  level: config.log.level,
  base: { service: '{{APP_SLUG}}', env: config.env },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.currentPassword',
      '*.newPassword',
      '*.passwordHash',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
  ...(config.env === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service,env' } } }
    : {}),
});

export type Logger = typeof logger;
