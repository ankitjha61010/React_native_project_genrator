import { Router } from 'express';
{{#if SEC_HELMET}}
import helmet from 'helmet';
{{/if}}
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from '{{IMPORT:ex.docs.openapi}}';

/** Swagger UI at /<API_PREFIX>/<SWAGGER_PATH> and the raw document at …/openapi.json. */
export function createDocsRouter(): Router {
  const document = buildOpenApiDocument();
  const router = Router();
{{#if SEC_HELMET}}
  // Swagger UI needs inline styles and data: images – relax the CSP for these pages only.
  router.use(
    helmet({
      contentSecurityPolicy: {
        directives: { 'img-src': ["'self'", 'data:'], 'style-src': ["'self'", "'unsafe-inline'"], 'script-src': ["'self'"] },
      },
    }),
  );
{{/if}}
  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });
  router.use('/', swaggerUi.serve, swaggerUi.setup(document, { customSiteTitle: '{{DISPLAY_NAME}} API' }));
  return router;
}
