import type { Request, Response } from 'express';
import { errorResponse } from '{{IMPORT:core.response}}';
import { COMMON_MESSAGES } from '{{IMPORT:core.messages}}';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(errorResponse(COMMON_MESSAGES.routeNotFound(req.method, req.path)));
}
