import type { Provider } from '@nestjs/common';
import type { HealthCheck } from '{{IMPORT:port.healthCheck}}';
{{#if STYLE_SERVICE}}
import { HealthService } from '{{IMPORT:app.healthService}}';
import { HEALTH_CHECKS } from '{{IMPORT:nest.tokens}}';
{{else}}
import { CheckHealthUseCase } from '{{IMPORT:uc.checkHealth}}';
import { HEALTH_CHECKS, HEALTH_USE_CASES } from '{{IMPORT:nest.tokens}}';

export function createHealthUseCases(checks: HealthCheck[]) {
  return { check: new CheckHealthUseCase(checks) };
}

export type HealthUseCases = ReturnType<typeof createHealthUseCases>;
{{/if}}

export const healthProviders: Provider[] = [
{{#if STYLE_SERVICE}}
  { provide: HealthService, useFactory: (checks: HealthCheck[]) => new HealthService(checks), inject: [HEALTH_CHECKS] },
{{else}}
  { provide: HEALTH_USE_CASES, useFactory: createHealthUseCases, inject: [HEALTH_CHECKS] },
{{/if}}
];
