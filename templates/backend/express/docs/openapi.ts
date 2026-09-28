import { OpenAPIRegistry, OpenApiGeneratorV31, type RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { config } from '{{IMPORT:config.env}}';
import { {{#if AUTH}}BEARER, {{/if}}envelope, errorResponses, json, pageMetaSchema } from '{{IMPORT:ex.docs.helpers}}';
import { routeGroups } from '{{IMPORT:ex.routes}}';

/** Builds the OpenAPI 3.1 document from the route definitions (nothing to keep in sync by hand). */
export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();
{{#if AUTH}}
  registry.registerComponent('securitySchemes', 'bearerAuth', { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Access token from a sign-in endpoint' });
{{/if}}

  for (const group of routeGroups) {
    for (const spec of group.routes) {
      const data = spec.response ?? z.null();
      const body = spec.paginated ? envelope(z.array(data), pageMetaSchema) : envelope(data);
      const request: RouteConfig['request'] = {
        ...(spec.params ? { params: spec.params as z.ZodObject } : {}),
        ...(spec.query ? { query: spec.query as z.ZodObject } : {}),
        ...(spec.body ? { body: json(spec.body) } : {}),
{{#if UPLOADS}}
        ...(spec.upload ? { body: { content: { 'multipart/form-data': { schema: z.object({ [spec.upload]: z.string().meta({ format: 'binary' }) }) } } } } : {}),
{{/if}}
      };
      registry.registerPath({
        method: spec.method,
        // Express `:id` → OpenAPI `{id}`
        path: `${group.prefix}${spec.path}`.replace(/:(\w+)/g, '{$1}') || '/',
        tags: [group.tag],
        summary: spec.summary,
{{#if AUTH}}
        ...(spec.auth || spec.permission ? { security: BEARER } : {}),
{{/if}}
        request,
        responses: { [spec.status ?? 200]: { description: spec.message, ...json(body) }, ...errorResponses(...(spec.errors ?? [])) },
      });
    }
  }

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: '{{DISPLAY_NAME}} API',
      version: '1.0.0',
      description: 'Every response uses the envelope `{ success, message, data, meta }`; errors use `{ success: false, message, code, errors }`.',
    },
    servers: [{ url: config.api.basePath }],
  });
}
