import type { Request, Response } from 'express';
import type { DevicesService } from '{{IMPORT:app.devicesService}}';
import { currentUser } from '{{IMPORT:ex.mw.auth}}';
import { sendSuccess } from '{{IMPORT:ex.respond}}';
import { parseBody, parseParams } from '{{IMPORT:ex.validation}}';
import { deviceParams, registerDeviceSchema } from '{{IMPORT:ex.devices.schemas}}';
import { DEVICES_MESSAGES } from '{{IMPORT:messages.devices}}';

/** Handles `/devices` requests. */
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  /** POST /devices – after every sign-in, on app start and when the FCM token changes */
  register = async (req: Request, res: Response) => {
    sendSuccess(res, DEVICES_MESSAGES.registered, await this.devices.register(currentUser(req).id, parseBody(registerDeviceSchema, req)));
  };

  /** GET /devices – every device you are signed in on, most recently active first */
  list = async (req: Request, res: Response) => {
    sendSuccess(res, DEVICES_MESSAGES.list, await this.devices.list(currentUser(req).id));
  };

  /** DELETE /devices/:deviceId – on logout (the device gets no more pushes) */
  remove = async (req: Request, res: Response) => {
    await this.devices.remove(currentUser(req).id, parseParams(deviceParams, req).deviceId);
    sendSuccess(res, DEVICES_MESSAGES.removed);
  };
}
