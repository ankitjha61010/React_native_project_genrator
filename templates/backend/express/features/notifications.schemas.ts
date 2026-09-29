import { z } from 'zod';
import { BROADCAST_AUDIENCES, NOTIFICATION_TYPES } from '{{IMPORT:domain.notification}}';

const data = z.record(z.string().max(64), z.string().max(1000)).refine(value => Object.keys(value).length <= 20, 'at most 20 keys');

export const broadcastSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(1000),
    type: z.enum(NOTIFICATION_TYPES).default('general'),
    audience: z.enum(BROADCAST_AUDIENCES).default('all'),
    data: data.optional().meta({ description: 'Extra string values for the app, e.g. { "url": "https://…" }' }),
  })
  .meta({ id: 'BroadcastRequest' });

// ── responses (used by the OpenAPI document) ──────────────────────────────────

export const notificationSchema = z
  .object({ id: z.string(), type: z.enum(NOTIFICATION_TYPES), title: z.string(), body: z.string(), data: z.record(z.string(), z.string()), read: z.boolean(), createdAt: z.iso.datetime() })
  .meta({ id: 'Notification' });

export const broadcastResponseSchema = z
  .object({ id: z.string(), title: z.string(), body: z.string(), type: z.enum(NOTIFICATION_TYPES), audience: z.enum(BROADCAST_AUDIENCES), recipientCount: z.number(), createdAt: z.iso.datetime() })
  .meta({ id: 'Broadcast' });
