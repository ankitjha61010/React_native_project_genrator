import type { Request, Response } from 'express';
import { errorResponse } from '{{IMPORT:core.response}}';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(errorResponse(`Route ${req.method} ${req.path} not found`, 'ROUTE_NOT_FOUND'));
}
