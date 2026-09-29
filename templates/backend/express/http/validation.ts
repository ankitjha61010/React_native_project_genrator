import type { Request } from 'express';
import type { z } from 'zod';
import { ValidationError } from '{{IMPORT:core.errors}}';

/**
 * Validates part of a request with a zod schema and returns the typed, cleaned-up value.
 * Invalid input throws a ValidationError → 422 `{ errors: [{ field, message }] }`.
 *
 *   const input = parseBody(loginSchema, req);   // { email: string; password: string }
 */
export function parseBody<S extends z.ZodType>(schema: S, req: Request): z.output<S> {
  return parse(schema, req.body ?? {}, '');
}

/** `?page=2&limit=20` → `{ page: 2, limit: 20 }` (errors are reported as `query.page`). */
export function parseQuery<S extends z.ZodType>(schema: S, req: Request): z.output<S> {
  return parse(schema, req.query, 'query');
}

/** `/users/:id` → `{ id }` (errors are reported as `params.id`). */
export function parseParams<S extends z.ZodType>(schema: S, req: Request): z.output<S> {
  return parse(schema, req.params, 'params');
}

function parse<S extends z.ZodType>(schema: S, value: unknown, location: string): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new ValidationError(
    result.error.issues.map(issue => {
      const path = issue.path.map(String).join('.');
      return { field: [location, path].filter(Boolean).join('.') || 'body', message: issue.message };
    }),
  );
}
