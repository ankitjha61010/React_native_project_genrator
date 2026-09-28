import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { config } from '{{IMPORT:config.env}}';
{{#if AUTH}}
import { registerAuthDocs } from '{{IMPORT:ex.auth.docs}}';
{{/if}}
import { registerHealthDocs } from '{{IMPORT:ex.health.docs}}';
import { registerUsersDocs } from '{{IMPORT:ex.users.docs}}';

/** Builds the OpenAPI 3.1 document from every feature's docs. */
export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();
{{#if AUTH}}
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Access token from /auth/login or /auth/register',
  });
{{/if}}
  registerHealthDocs(registry);
{{#if AUTH}}
  registerAuthDocs(registry);
{{/if}}
  registerUsersDocs(registry);

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
