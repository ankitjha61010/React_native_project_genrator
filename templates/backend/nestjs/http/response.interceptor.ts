import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import { COMMON_MESSAGES } from '{{IMPORT:core.messages}}';
import { Paginated } from '{{IMPORT:core.pagination}}';
import { successResponse, type ApiSuccessResponse } from '{{IMPORT:core.response}}';
import { RESPONSE_MESSAGE } from '{{IMPORT:nest.decorators}}';

/** A result with extra `meta` for the envelope (e.g. `{ unreadCount }`). */
export class WithMeta {
  constructor(
    readonly data: unknown,
    readonly meta: Record<string, unknown>,
  ) {}
}

/**
 * Wraps every controller result in `{ success, message, data, meta }`. A `Paginated`
 * result is split into `data` (items) and `meta` (page info). The message comes from
 * `@Endpoint()` / `@ResponseMessage()`; `WithMeta` adds extra meta.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiSuccessResponse<unknown>> {
    const message = this.reflector.get<string | undefined>(RESPONSE_MESSAGE, context.getHandler()) ?? COMMON_MESSAGES.ok;
    return next.handle().pipe(
      map((data: unknown) => {
        if (data instanceof Paginated) return successResponse(data.items, message, { ...data.meta });
        if (data instanceof WithMeta) return successResponse(data.data, message, data.meta);
        return successResponse(data ?? null, message);
      }),
    );
  }
}
