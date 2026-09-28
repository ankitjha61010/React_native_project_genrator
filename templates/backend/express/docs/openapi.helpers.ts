import type { ResponseConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/** Shared schemas & helpers for the OpenAPI document. */

const fieldErrorSchema = z.object({ field: z.string().optional(), message: z.string() });

export const errorResponseSchema = z
  .object({
    success: z.literal(false),
    message: z.string(),
    code: z.string().meta({ example: 'VALIDATION_ERROR' }),
    errors: z.array(fieldErrorSchema),
  })
  .meta({ id: 'ErrorResponse' });

export const pageMetaSchema = z
  .object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  })
  .meta({ id: 'PageMeta' });

/** `{ success: true, message, data, meta? }` around a schema. */
export function envelope(data: z.ZodType, meta?: z.ZodType) {
  return z.object({ success: z.literal(true), message: z.string(), data, ...(meta ? { meta } : {}) });
}

export function json(schema: z.ZodType) {
  return { content: { 'application/json': { schema } } };
}

const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: 'Bad request',
  401: 'Missing, invalid or expired access token',
  403: 'Not allowed',
  404: 'Not found',
  409: 'Conflict',
  413: 'Request body too large',
  422: 'Validation failed (see `errors`)',
  423: 'Account temporarily locked',
  429: 'Too many requests',
  500: 'Internal server error',
  503: 'Service degraded',
};

export function errorResponses(...statuses: number[]): Record<number, ResponseConfig> {
  return Object.fromEntries(
    [...statuses, 500].map(status => [status, { description: ERROR_DESCRIPTIONS[status] ?? 'Error', ...json(errorResponseSchema) }]),
  );
}
{{#if AUTH}}

export const BEARER = [{ bearerAuth: [] }];
{{/if}}
