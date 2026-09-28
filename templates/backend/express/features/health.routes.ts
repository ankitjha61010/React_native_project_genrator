import { Router } from 'express';
import type { HealthController } from '{{IMPORT:ex.health.controller}}';

export function createHealthRouter(controller: HealthController): Router {
  const router = Router();
  router.get('/', controller.check);
  return router;
}
