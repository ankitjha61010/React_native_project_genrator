import { Router } from 'express';
import type { Services } from '{{IMPORT:app.container}}';
import { HealthController } from '{{IMPORT:ex.health.controller}}';

/** `/health` – liveness / readiness for load balancers and uptime monitors. */
export function healthRoutes(services: Services): Router {
  const router = Router();
  const health = new HealthController(services.health);

  router.get('/', health.check);
  return router;
}
