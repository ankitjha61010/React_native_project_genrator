import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import { Paginated } from '{{IMPORT:core.pagination}}';
import { successResponse, type ApiSuccessResponse } from '{{IMPORT:core.response}}';
import { RESPONSE_MESSAGE } from '{{IMPORT:nest.decorators}}';

/**
 * Wraps every controller result in `{ success, message, data, meta }`. A `Paginated`
 * result is split into `data` (items) and `meta` (page info). The message comes from
 * `@ResponseMessage()`.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiSuccessResponse<unknown>> {
    const message = this.reflector.get<string | undefined>(RESPONSE_MESSAGE, context.getHandler()) ?? 'OK';
    return next.handle().pipe(
      map((data: unknown) => (data instanceof Paginated ? successResponse(data.items, message, { ...data.meta }) : successResponse(data ?? null, message))),
    );
  }
}
