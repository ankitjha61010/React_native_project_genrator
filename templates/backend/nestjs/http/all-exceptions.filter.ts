import { Catch, HttpException, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from '{{IMPORT:core.errors}}';
import { logger } from '{{IMPORT:core.logger}}';
import { COMMON_MESSAGES, type ErrorMessage } from '{{IMPORT:core.messages}}';
import { errorResponse } from '{{IMPORT:core.response}}';

/** Nest's own HTTP exceptions → the API's messages (see messages.ts). */
function messageFor(status: number, req: Request): ErrorMessage {
  switch (status as HttpStatus) {
    case HttpStatus.UNAUTHORIZED:
      return COMMON_MESSAGES.unauthorized;
    case HttpStatus.FORBIDDEN:
      return COMMON_MESSAGES.forbidden;
    case HttpStatus.NOT_FOUND:
      return COMMON_MESSAGES.routeNotFound(req.method, req.path);
    case HttpStatus.METHOD_NOT_ALLOWED:
      return COMMON_MESSAGES.methodNotAllowed;
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return COMMON_MESSAGES.payloadTooLarge;
    case HttpStatus.TOO_MANY_REQUESTS:
      return COMMON_MESSAGES.tooManyRequests;
    default:
      return status >= 500 ? COMMON_MESSAGES.internal : COMMON_MESSAGES.badRequest;
  }
}

/**
 * Turns every exception into the standard error envelope. AppError (application errors)
 * and Nest HttpExceptions keep their status; anything else is logged and becomes a 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();
    const log = req.log ?? logger;

    if (exception instanceof AppError) {
      if (!exception.expose) log.error({ err: exception }, exception.message);
      res.status(exception.statusCode).json(errorResponse(exception.expose ? exception : COMMON_MESSAGES.internal, exception.errors));
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) log.error({ err: exception }, exception.message);
      res.status(status).json(errorResponse(messageFor(status, req)));
      return;
    }

    log.error({ err: exception }, 'Unhandled error');
    res.status(500).json(errorResponse(COMMON_MESSAGES.internal));
  }
}
