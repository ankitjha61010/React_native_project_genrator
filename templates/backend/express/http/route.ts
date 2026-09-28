import type { Request, RequestHandler, Response, Router } from 'express';
{{#if UPLOADS}}
import multer from 'multer';
{{/if}}
import type { z } from 'zod';
{{#if UPLOADS}}
import { config } from '{{IMPORT:config.env}}';
{{/if}}
{{#if AUTH}}
import { {{#if UPLOADS}}AppError, {{/if}}ForbiddenError, UnauthorizedError, ValidationError, type FieldError } from '{{IMPORT:core.errors}}';
import { hasPermission, type Permission } from '{{IMPORT:domain.roles}}';
import type { User } from '{{IMPORT:domain.user}}';
{{else}}
import { ValidationError, type FieldError } from '{{IMPORT:core.errors}}';
{{/if}}
{{#if UPLOADS}}
import type { UploadedFile } from '{{IMPORT:port.fileStorage}}';
{{/if}}
import type { Services } from '{{IMPORT:app.container}}';
{{#if SEC_AUTH_RATE_LIMIT}}
import { authRateLimit } from '{{IMPORT:ex.mw.rateLimit}}';
{{/if}}
import { respond } from '{{IMPORT:ex.respond}}';

type Schema = z.ZodType | undefined;
type Infer<S extends Schema> = S extends z.ZodType ? z.output<S> : undefined;

/** Everything a route handler gets – already authenticated and validated. */
export interface RouteContext<B extends Schema, Q extends Schema, P extends Schema> {
  body: Infer<B>;
  query: Infer<Q>;
  params: Infer<P>;
{{#if AUTH}}
  /** The signed-in user (routes with `auth` / `permission`). */
  user: User;
{{/if}}
{{#if UPLOADS}}
  /** The uploaded file (routes with `upload`). */
  file: UploadedFile;
{{/if}}
  client: { ip?: string; userAgent?: string };
  req: Request;
  res: Response;
}

/**
 * One endpoint: how it's called, who may call it, what it accepts – and the handler.
 * The same definition registers the Express route and documents it in OpenAPI.
 */
export interface RouteSpec<B extends Schema = Schema, Q extends Schema = Schema, P extends Schema = Schema> {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  summary: string;
  /** Success message of the response envelope. */
  message: string;
  status?: number;
{{#if AUTH}}
  /** Requires `Authorization: Bearer <access token>`. */
  auth?: boolean;
  /** Requires a permission (implies `auth`), see roles.ts. */
  permission?: Permission;
{{/if}}
  /** Stricter rate limit for credentials / codes (when auth rate limiting is enabled). */
  limited?: boolean;
{{#if UPLOADS}}
  /** multipart/form-data with one file in this field. */
  upload?: string;
{{/if}}
  body?: B;
  query?: Q;
  params?: P;
  /** Docs: schema of `data` in the response. */
  response?: z.ZodType;
  /** Docs: `data` is a page (array + meta). */
  paginated?: boolean;
  /** Docs: error statuses this route can answer. */
  errors?: number[];
  handler(ctx: RouteContext<B, Q, P>, services: Services): Promise<unknown>;
}

/** Typed helper – infers body / query / params types from the schemas. */
export const route = <B extends Schema = undefined, Q extends Schema = undefined, P extends Schema = undefined>(spec: RouteSpec<B, Q, P>): RouteSpec => spec;

/** The routes of one feature, mounted under `prefix`. */
export interface RouteGroup {
  prefix: string;
  tag: string;
  routes: RouteSpec[];
}

/** A result with extra `meta` for the envelope (e.g. `{ unreadCount }`). */
export class WithMeta {
  constructor(
    readonly data: unknown,
    readonly meta: Record<string, unknown>,
  ) {}
}

function validate(req: Request, spec: RouteSpec): { body: unknown; query: unknown; params: unknown } {
  const errors: FieldError[] = [];
  const result = { body: undefined as unknown, query: undefined as unknown, params: undefined as unknown };
  for (const location of ['params', 'query', 'body'] as const) {
    const schema = spec[location];
    if (!schema) continue;
    const parsed = schema.safeParse(req[location] ?? {});
    if (parsed.success) {
      result[location] = parsed.data;
      continue;
    }
    for (const issue of parsed.error.issues) {
      const path = issue.path.map(String).join('.');
      // Body fields are reported as `email`; query / params as `query.page`.
      errors.push({ field: location === 'body' ? path || 'body' : [location, path].filter(Boolean).join('.'), message: issue.message });
    }
  }
  if (errors.length) throw new ValidationError(errors);
  return result;
}
{{#if AUTH}}

function authenticate(services: Services): RequestHandler {
  return async (req, res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) throw new UnauthorizedError('Missing bearer token', 'MISSING_TOKEN');
    res.locals.user = await services.sessions.authenticate(token);
    next();
  };
}
{{/if}}
{{#if UPLOADS}}

const uploader = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.uploads.maxBytes, files: 1 } });

function upload(field: string): RequestHandler {
  const single = uploader.single(field);
  return (req, res, next) =>
    single(req, res, error => {
      if (error instanceof multer.MulterError) {
        return next(error.code === 'LIMIT_FILE_SIZE' ? new AppError(`The file is larger than ${config.uploads.maxBytes / 1024 / 1024} MB`, 413, 'PAYLOAD_TOO_LARGE') : new ValidationError([{ field, message: error.message }]));
      }
      next(error);
    });
}
{{/if}}

/** Registers every route of the groups on the router. */
export function mountRoutes(router: Router, groups: RouteGroup[], services: Services): void {
  for (const group of groups) {
    for (const spec of group.routes) {
      const chain: RequestHandler[] = [];
{{#if SEC_AUTH_RATE_LIMIT}}
      if (spec.limited) chain.push(authRateLimit);
{{/if}}
{{#if AUTH}}
      if (spec.auth || spec.permission) chain.push(authenticate(services));
      if (spec.permission) {
        const permission = spec.permission;
        chain.push((_req, res, next) => (hasPermission((res.locals.user as User).role, permission) ? next() : next(new ForbiddenError())));
      }
{{/if}}
{{#if UPLOADS}}
      if (spec.upload) chain.push(upload(spec.upload));
{{/if}}
      chain.push(async (req, res) => {
{{#if UPLOADS}}
        if (spec.upload && !req.file) throw new ValidationError([{ field: spec.upload, message: 'A file is required' }]);
{{/if}}
        const context: RouteContext<Schema, Schema, Schema> = {
          ...validate(req, spec),
{{#if AUTH}}
          user: res.locals.user as User,
{{/if}}
{{#if UPLOADS}}
          // Only upload routes read it – the check above guarantees it's there.
          file: (req.file && { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size }) as UploadedFile,
{{/if}}
          client: { ip: req.ip, userAgent: req.get('user-agent') },
          req,
          res,
        };
        const result = await spec.handler(context, services);
        // A handler may pick the status itself (`ctx.res.status(503)`).
        const options = { status: spec.status ?? res.statusCode, message: spec.message };
        if (result instanceof WithMeta) respond(res, result.data, { ...options, meta: result.meta });
        else respond(res, result ?? null, options);
      });
      router[spec.method](`${group.prefix}${spec.path}`, ...chain);
    }
  }
}
