import type { NextFunction, Request, Response } from 'express';
import { AppError } from '{{IMPORT:core.errors}}';
import { logger } from '{{IMPORT:core.logger}}';
import { errorResponse } from '{{IMPORT:core.response}}';

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
    res.status(error.statusCode).json(errorResponse(error.expose ? error.message : 'Internal server error', error.code, error.errors));
    return;
  }

  const parserError = error as HttpParserError;
  if (parserError?.type === 'entity.parse.failed') {
    res.status(400).json(errorResponse('Malformed JSON body', 'INVALID_JSON'));
    return;
  }
  if (parserError?.type === 'entity.too.large') {
    res.status(413).json(errorResponse('Request body is too large', 'PAYLOAD_TOO_LARGE'));
    return;
  }
  if (parserError?.status && parserError.status >= 400 && parserError.status < 500) {
    res.status(parserError.status).json(errorResponse('Bad request', 'BAD_REQUEST'));
    return;
  }

  (req.log ?? logger).error({ err: error }, 'Unhandled error');
  res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
}
