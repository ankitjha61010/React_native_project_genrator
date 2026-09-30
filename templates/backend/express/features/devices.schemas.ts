import { z } from 'zod';
import { DeviceType } from '{{IMPORT:domain.device}}';

/** FCM rotated the token – the only device change the app sends outside sign-in. */
export const updateFcmTokenSchema = z
  .object({ fcmToken: z.string().min(10).max(512).meta({ description: 'The new FCM registration token' }) })
  .meta({ id: 'UpdateFcmTokenRequest' });

export const deviceParams = z.object({ deviceId: z.string().min(1).max(128) });

// ── responses (used by the OpenAPI document) ──────────────────────────────────

export const deviceSchema = z
  .object({
    deviceId: z.string(),
    deviceType: z.enum(DeviceType),
    deviceModel: z.string().nullable(),
    osVersion: z.string().nullable(),
    appVersion: z.string().nullable(),
    pushEnabled: z.boolean(),
    lastActiveAt: z.iso.datetime(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'Device' });
