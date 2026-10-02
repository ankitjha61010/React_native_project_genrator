import { Router } from 'express';
import type { Services } from '{{IMPORT:app.container}}';
{{#if AUTH}}
import { requireAuth, requirePermission } from '{{IMPORT:ex.mw.auth}}';
{{/if}}
import { LegalController } from '{{IMPORT:ex.legal.controller}}';

/** `/legal` – read by the app (public){{#if AUTH}}, changed in the admin panel{{/if}}. */
export function legalRoutes(services: Services): Router {
  const router = Router();
  const legal = new LegalController(services.legal);

  router.get('/', legal.get);
{{#if AUTH}}
  router.put('/', requireAuth(services.sessions), requirePermission('legal:write'), legal.update);
{{/if}}
  return router;
}
