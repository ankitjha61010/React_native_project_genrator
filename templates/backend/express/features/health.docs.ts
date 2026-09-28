import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { envelope, errorResponses, ok } from '{{IMPORT:ex.docs.helpers}}';

const healthSchema = z
  .object({
    status: z.enum(['ok', 'degraded']),
    uptime: z.number(),
    timestamp: z.iso.datetime(),
    checks: z.record(z.string(), z.enum(['up', 'down'])),
  })
  .meta({ id: 'HealthReport' });

const healthResponse = envelope(healthSchema, 'HealthResponse');

export function registerHealthDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    summary: 'Liveness / readiness (database connectivity)',
    responses: {
      200: ok('Healthy', healthResponse),
      503: ok('A dependency is down', healthResponse),
      ...errorResponses(),
    },
  });
}
