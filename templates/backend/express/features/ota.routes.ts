import { Router } from 'express';
import type { Services } from '{{IMPORT:app.container}}';
import { requireAuth, requirePermission } from '{{IMPORT:ex.mw.auth}}';
import { OTAController } from '{{IMPORT:ex.ota.controller}}';

/** `/ota` – update checks + telemetry (public, the app), releases (admin panel). */
export function otaRoutes(services: Services): Router {
  const router = Router();
  const ota = new OTAController(services.ota);

  router.get('/check', ota.check);
  router.post('/download-event', ota.downloadEvent);

  const auth = requireAuth(services.sessions);
  router.get('/releases', auth, requirePermission('ota:read'), ota.listReleases);
  router.post('/releases', auth, requirePermission('ota:write'), ota.createRelease);
  router.post('/releases/:id/rollback', auth, requirePermission('ota:write'), ota.rollback);
  return router;
}
