import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { logger } from '{{IMPORT:core.logger}}';

/** One log line per request (method, url, status, duration) with a request id. */
export const requestLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const header = req.headers['x-request-id'];
    const id = typeof header === 'string' && /^[\w-]{1,64}$/.test(header) ? header : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel(_req, res, error) {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: req => ({ id: req.id, method: req.method, url: req.url }),
    res: res => ({ statusCode: res.statusCode }),
  },
});
