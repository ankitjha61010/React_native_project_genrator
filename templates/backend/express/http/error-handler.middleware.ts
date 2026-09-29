import type { NextFunction, Request, Response } from 'express';
import { AppError } from '{{IMPORT:core.errors}}';
import { logger } from '{{IMPORT:core.logger}}';
import { errorResponse } from '{{IMPORT:core.response}}';
import { COMMON_MESSAGES } from '{{IMPORT:core.messages}}';

/** Errors thrown by express' body parser. */
interface HttpParserError {
  type?: string;
  status?: number;
}

/**
 * Turns every error into the standard error envelope. Expected errors (AppError, 4xx)
 * keep their message; unexpected ones are logged and answered with a generic 500.
 */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    if (!error.expose) req.log?.error({ err: error }, error.message);
    res.status(error.statusCode).json(errorResponse(error.expose ? error : COMMON_MESSAGES.internal, error.errors));
    return;
  }

  const parserError = error as HttpParserError;
  if (parserError?.type === 'entity.parse.failed') {
    res.status(400).json(errorResponse(COMMON_MESSAGES.malformedJson));
    return;
  }
  if (parserError?.type === 'entity.too.large') {
    res.status(413).json(errorResponse(COMMON_MESSAGES.payloadTooLarge));
    return;
  }
  if (parserError?.status && parserError.status >= 400 && parserError.status < 500) {
    res.status(parserError.status).json(errorResponse(COMMON_MESSAGES.badRequest));
    return;
  }

  (req.log ?? logger).error({ err: error }, 'Unhandled error');
  res.status(500).json(errorResponse(COMMON_MESSAGES.internal));
}
