import { HealthService } from '{{IMPORT:app.healthService}}';
import type { HealthCheck } from '{{IMPORT:port.healthCheck}}';
import { HealthController } from '{{IMPORT:ex.health.controller}}';
import { createHealthRouter } from '{{IMPORT:ex.health.routes}}';

/** Public API of the health module. */
export function createHealthModule(deps: { healthChecks: HealthCheck[] }) {
  const service = new HealthService(deps.healthChecks);
  return { service, router: createHealthRouter(new HealthController(service)) };
}

export type HealthModule = ReturnType<typeof createHealthModule>;
