import type { Request } from 'express';
import type { z } from 'zod';
import { ValidationError, type FieldError } from '{{IMPORT:core.errors}}';

type Schemas = { body?: z.ZodType; query?: z.ZodType; params?: z.ZodType };
type Parsed<S extends Schemas> = { [K in keyof S]: S[K] extends z.ZodType ? z.infer<S[K]> : never };

/**
 * Validates `req.body` / `req.query` / `req.params` against zod schemas and returns the
 * typed, parsed values. Throws ValidationError (422) listing every invalid field.
 *
 *   const { body } = parseRequest(req, { body: registerSchema });
 */
export function parseRequest<S extends Schemas>(req: Request, schemas: S): Parsed<S> {
  const errors: FieldError[] = [];
  const result: Record<string, unknown> = {};
  for (const location of ['params', 'query', 'body'] as const) {
    const schema = schemas[location];
    if (!schema) continue;
    const parsed = schema.safeParse(req[location] ?? {});
    if (parsed.success) {
      result[location] = parsed.data;
    } else {
      for (const issue of parsed.error.issues) {
        const path = issue.path.map(String).join('.');
        // Body fields are reported as `email`; query / params as `query.page`.
        const field = location === 'body' ? path || 'body' : [location, path].filter(Boolean).join('.');
        errors.push({ field, message: issue.message });
      }
    }
  }
  if (errors.length) throw new ValidationError(errors);
  return result as Parsed<S>;
}
