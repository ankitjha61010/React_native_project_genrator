import type { NextFunction, Request, Response } from 'express';
import { sanitize } from '{{IMPORT:core.sanitize}}';

/** Sanitizes body, query and route params (see core/sanitize.ts). */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) req.body = sanitize(req.body);
  // Express 5 exposes `req.query` as a getter – replace it with the sanitized copy.
  Object.defineProperty(req, 'query', { value: sanitize(req.query), writable: true, configurable: true, enumerable: true });
  next();
}
