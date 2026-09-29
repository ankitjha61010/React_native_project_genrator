import type { Response } from 'express';
import { successResponse } from '{{IMPORT:core.response}}';
import { Paginated } from '{{IMPORT:core.pagination}}';

interface SuccessOptions {
  /** HTTP status (default 200). */
  status?: number;
  /** Extra fields for `meta`, e.g. `{ unreadCount: 3 }`. */
  meta?: Record<string, unknown>;
}

/**
 * Sends the standard success response `{ success: true, message, data, meta }`.
 * A `Paginated` result is split into `data` (the items) and `meta` (page, total…).
 *
 *   sendSuccess(res, 'Profile updated', toPublicUser(user));
 *   sendSuccess(res, 'Registered successfully', session, { status: 201 });
 */
export function sendSuccess(res: Response, message: string, data: unknown = null, { status = 200, meta }: SuccessOptions = {}): void {
  if (data instanceof Paginated) {
    res.status(status).json(successResponse(data.items, message, { ...data.meta, ...meta }));
    return;
  }
  res.status(status).json(successResponse(data, message, meta));
}
