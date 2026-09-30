import type { HealthCheck } from '{{IMPORT:port.healthCheck}}';

/** Channels between the services. */
export const EVENT_CHANNELS = {
  /** identity → others: `{ type: 'user.upserted', user }` / `{ type: 'user.deleted', id }` */
  users: 'users',
  /** chat → notifications: `{ userIds, message }` */
  push: 'push',
  /** notifications → chat (the socket server): `{ to: 'user' | 'conversation', id, event, payload }` */
  realtime: 'realtime',
  /** identity → notifications: `{ type: 'device.saved', userId, device }` / `{ type: 'device.removed', userId, deviceId? }` */
  devices: 'devices',
} as const;

export type EventChannel = (typeof EVENT_CHANNELS)[keyof typeof EVENT_CHANNELS];

/** Publish / subscribe between services (Redis). Delivery is at-most-once: handlers must be idempotent. */
export interface EventBus {
  publish(channel: EventChannel, payload: unknown): Promise<void>;
  subscribe(channel: EventChannel, handler: (payload: unknown) => Promise<void> | void): Promise<void>;
  readonly healthCheck: HealthCheck;
  close(): Promise<void>;
}
