import { z } from 'zod';
import type { ApiDocGroup } from '{{IMPORT:ex.docs.helpers}}';
import { deviceParams, deviceSchema, registerDeviceSchema } from '{{IMPORT:ex.devices.schemas}}';

/** Swagger docs of devices.routes.ts. */
export const devicesDocs: ApiDocGroup = {
  tag: 'Devices',
  endpoints: [
    { method: 'post', path: '/devices', summary: 'Register / update this device (FCM token, model, versions) – after every sign-in, on app start and on token refresh', auth: true, body: registerDeviceSchema, response: deviceSchema, errors: [401, 422] },
    { method: 'get', path: '/devices', summary: 'Every device you are signed in on', auth: true, response: z.array(deviceSchema), errors: [401] },
    { method: 'delete', path: '/devices/:deviceId', summary: 'Remove a device (call on logout – it gets no more pushes)', auth: true, params: deviceParams, errors: [401, 404] },
  ],
};
