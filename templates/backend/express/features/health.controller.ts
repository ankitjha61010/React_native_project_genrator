import { z } from 'zod';
import { route, type RouteGroup } from '{{IMPORT:ex.route}}';

const healthSchema = z
  .object({ status: z.enum(['ok', 'degraded']), uptime: z.number(), timestamp: z.iso.datetime(), checks: z.record(z.string(), z.enum(['up', 'down'])) })
  .meta({ id: 'HealthReport' });

export const healthRoutes: RouteGroup = {
  prefix: '/health',
  tag: 'Health',
  routes: [
    route({
      method: 'get',
      path: '',
      summary: 'Liveness / readiness (database connectivity) – 503 when degraded',
      message: 'Health status',
      response: healthSchema,
      errors: [503],
      async handler({ res }, { health }) {
        const report = await health.check();
        if (report.status !== 'ok') res.status(503);
        return report;
      },
    }),
  ],
};
