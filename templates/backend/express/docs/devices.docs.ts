import { z } from 'zod';
import type { ApiDocGroup } from '{{IMPORT:ex.docs.helpers}}';
import { deviceParams, deviceSchema, updateFcmTokenSchema } from '{{IMPORT:ex.devices.schemas}}';

/** Swagger docs of devices.routes.ts. Devices are saved by the sign-in requests (their `device`). */
export const devicesDocs: ApiDocGroup = {
  tag: 'Devices',
  endpoints: [
    { method: 'get', path: '/devices', summary: 'Every device you are signed in on', auth: true, response: z.array(deviceSchema), errors: [401] },
    { method: 'patch', path: '/devices/:deviceId', summary: 'FCM rotated the token of this install', auth: true, params: deviceParams, body: updateFcmTokenSchema, response: deviceSchema, errors: [401, 404, 422] },
  ],
};
