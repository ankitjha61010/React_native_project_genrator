import { Router } from 'express';
import type { Services } from '{{IMPORT:app.container}}';
import { requireAuth } from '{{IMPORT:ex.mw.auth}}';
import { DevicesController } from '{{IMPORT:ex.devices.controller}}';

/** `/devices` – the devices (app installs) the user is signed in on, and their FCM tokens. */
export function devicesRoutes(services: Services): Router {
  const router = Router();
  const devices = new DevicesController(services.devices);

  // Every /devices route needs a signed-in user.
  router.use(requireAuth(services.sessions));

  router.post('/', devices.register);
  router.get('/', devices.list);
  router.delete('/:deviceId', devices.remove);
  return router;
}
