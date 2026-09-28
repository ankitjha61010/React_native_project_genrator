import type { Response } from 'express';
import { successResponse } from '{{IMPORT:core.response}}';
import { Paginated } from '{{IMPORT:core.pagination}}';

interface RespondOptions {
  message?: string;
  status?: number;
  meta?: Record<string, unknown>;
}

/**
 * Sends the standard success envelope `{ success, message, data, meta }`.
 * A `Paginated` value is split into `data` (items) and `meta` (page info).
 */
export function respond(res: Response, data: unknown, { message = 'OK', status = 200, meta }: RespondOptions = {}): void {
  if (data instanceof Paginated) {
    res.status(status).json(successResponse(data.items, message, { ...data.meta, ...meta }));
    return;
  }
  res.status(status).json(successResponse(data, message, meta));
}
