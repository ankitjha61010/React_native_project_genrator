import type { Request, Response } from 'express';
import type { DevicesService } from '{{IMPORT:app.devicesService}}';
import { currentUser } from '{{IMPORT:ex.mw.auth}}';
import { sendSuccess } from '{{IMPORT:ex.respond}}';
import { parseBody, parseParams } from '{{IMPORT:ex.validation}}';
import { deviceParams, updateFcmTokenSchema, updateVoipTokenSchema } from '{{IMPORT:ex.devices.schemas}}';
import { DEVICES_MESSAGES } from '{{IMPORT:messages.devices}}';

/** Handles `/devices` requests. Devices are saved by the sign-in requests themselves (their `device`). */
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  /** GET /devices – every device you are signed in on, most recently active first */
  list = async (req: Request, res: Response) => {
    sendSuccess(res, DEVICES_MESSAGES.list, await this.devices.list(currentUser(req).id));
  };

  /** PATCH /devices/:deviceId – FCM rotated this install's token */
  updateFcmToken = async (req: Request, res: Response) => {
    const { fcmToken } = parseBody(updateFcmTokenSchema, req);
    sendSuccess(res, DEVICES_MESSAGES.tokenUpdated, await this.devices.updateFcmToken(currentUser(req).id, parseParams(deviceParams, req).deviceId, fcmToken));
  };

  /** PATCH /devices/:deviceId/voip-token – iOS VoIP push token updated */
  updateVoipToken = async (req: Request, res: Response) => {
    const { voipToken } = parseBody(updateVoipTokenSchema, req);
    sendSuccess(res, DEVICES_MESSAGES.tokenUpdated, await this.devices.updateVoipToken(currentUser(req).id, parseParams(deviceParams, req).deviceId, voipToken));
  };
}
