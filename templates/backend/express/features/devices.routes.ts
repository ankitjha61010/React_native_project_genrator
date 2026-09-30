import { Router } from 'express';
import type { Services } from '{{IMPORT:app.container}}';
import { requireAuth } from '{{IMPORT:ex.mw.auth}}';
import { DevicesController } from '{{IMPORT:ex.devices.controller}}';

/**
 * `/devices` – the devices (app installs) the user is signed in on. There is no "register"
 * route: login / register / OTP / social sign-in / refresh carry the `device`, logout removes it.
 */
export function devicesRoutes(services: Services): Router {
  const router = Router();
  const devices = new DevicesController(services.devices);

  // Every /devices route needs a signed-in user.
  router.use(requireAuth(services.sessions));

  router.get('/', devices.list);
  router.patch('/:deviceId', devices.updateFcmToken);
  return router;
}
