import { Catch, HttpException, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from '{{IMPORT:core.errors}}';
import { logger } from '{{IMPORT:core.logger}}';
import { errorResponse } from '{{IMPORT:core.response}}';

const CODES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'ROUTE_NOT_FOUND',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'METHOD_NOT_ALLOWED',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

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
      res.status(exception.statusCode).json(errorResponse(exception.expose ? exception.message : 'Internal server error', exception.code, exception.errors));
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) log.error({ err: exception }, exception.message);
      const message = status === 429 ? 'Too many requests, please try again later' : status >= 500 ? 'Internal server error' : exception.message;
      res.status(status).json(errorResponse(message, CODES[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST')));
      return;
    }

    log.error({ err: exception }, 'Unhandled error');
    res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
}
