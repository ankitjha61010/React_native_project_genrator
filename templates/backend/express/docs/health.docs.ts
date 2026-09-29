import { z } from 'zod';
import type { ApiDocGroup } from '{{IMPORT:ex.docs.helpers}}';

const healthSchema = z
  .object({ status: z.enum(['ok', 'degraded']), uptime: z.number(), timestamp: z.iso.datetime(), checks: z.record(z.string(), z.enum(['up', 'down'])) })
  .meta({ id: 'HealthReport' });

/** Swagger docs of health.routes.ts. */
export const healthDocs: ApiDocGroup = {
  tag: 'Health',
  endpoints: [{ method: 'get', path: '/health', summary: 'Liveness / readiness (database connectivity) – 503 when degraded', response: healthSchema, errors: [503] }],
};
