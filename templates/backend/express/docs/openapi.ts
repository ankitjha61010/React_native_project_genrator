import { OpenAPIRegistry, OpenApiGeneratorV31, type RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { config } from '{{IMPORT:config.env}}';
{{#if AUTH_API}}
import { authDocs } from '{{IMPORT:ex.auth.docs}}';
{{/if}}
{{#if CHAT}}
import { chatDocs } from '{{IMPORT:ex.chat.docs}}';
{{/if}}
{{#if DEVICES}}
import { devicesDocs } from '{{IMPORT:ex.devices.docs}}';
{{/if}}
import { healthDocs } from '{{IMPORT:ex.health.docs}}';
{{#if LEGAL}}
import { legalDocs } from '{{IMPORT:ex.legal.docs}}';
{{/if}}
{{#if OTA}}
import { otaDocs } from '{{IMPORT:ex.ota.docs}}';
{{/if}}
{{#if PAYMENTS}}
import { paymentsDocs } from '{{IMPORT:ex.payments.docs}}';
{{/if}}
{{#if NOTIFICATIONS}}
import { notificationsDocs } from '{{IMPORT:ex.notifications.docs}}';
{{/if}}
import { {{#if AUTH}}BEARER, {{/if}}envelope, errorResponses, json, pageMetaSchema, type ApiDocGroup } from '{{IMPORT:ex.docs.helpers}}';
{{#if USERS_API}}
import { usersDocs } from '{{IMPORT:ex.users.docs}}';
{{/if}}

/** Every documented feature – add a new feature's docs here. */
const groups: ApiDocGroup[] = [healthDocs{{#if AUTH_API}}, authDocs{{/if}}{{#if USERS_API}}, usersDocs{{/if}}{{#if CHAT}}, chatDocs{{/if}}{{#if DEVICES}}, devicesDocs{{/if}}{{#if NOTIFICATIONS}}, notificationsDocs{{/if}}{{#if LEGAL}}, legalDocs{{/if}}{{#if OTA}}, otaDocs{{/if}}{{#if PAYMENTS}}, paymentsDocs{{/if}}];

/** Builds the OpenAPI 3.1 document shown by Swagger UI. */
export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();
{{#if AUTH}}
  registry.registerComponent('securitySchemes', 'bearerAuth', { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Access token from a sign-in endpoint' });
{{/if}}

  for (const { tag, endpoints } of groups) {
    for (const doc of endpoints) {
      const data = doc.response ?? z.null();
      const body = doc.paginated ? envelope(z.array(data), pageMetaSchema) : envelope(data);
      const request: RouteConfig['request'] = {
        ...(doc.params ? { params: doc.params } : {}),
        ...(doc.query ? { query: doc.query } : {}),
        ...(doc.body ? { body: json(doc.body) } : {}),
{{#if UPLOADS}}
        ...(doc.upload ? { body: { content: { 'multipart/form-data': { schema: z.object({ [doc.upload]: z.string().meta({ format: 'binary' }) }) } } } } : {}),
{{/if}}
      };
      registry.registerPath({
        method: doc.method,
        // Express `:id` → OpenAPI `{id}`
        path: doc.path.replace(/:(\w+)/g, '{$1}'),
        tags: [tag],
        summary: doc.summary,
{{#if AUTH}}
        ...(doc.auth ? { security: BEARER } : {}),
{{/if}}
        request,
        responses: { [doc.status ?? 200]: { description: 'Success', ...json(body) }, ...errorResponses(...(doc.errors ?? [])) },
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
