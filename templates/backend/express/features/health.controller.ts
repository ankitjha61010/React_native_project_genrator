import type { Request, Response } from 'express';
{{#if STYLE_SERVICE}}
import type { HealthService } from '{{IMPORT:app.healthService}}';
{{else}}
import type { CheckHealthUseCase } from '{{IMPORT:uc.checkHealth}}';
{{/if}}
import { respond } from '{{IMPORT:ex.respond}}';

{{#if STYLE_USECASE}}
export interface HealthUseCases {
  check: CheckHealthUseCase;
}

{{/if}}
export class HealthController {
  constructor(private readonly health: {{#if STYLE_SERVICE}}HealthService{{else}}HealthUseCases{{/if}}) {}

  check = async (_req: Request, res: Response) => {
    const report = await this.health.check{{CALL}}();
    respond(res, report, { status: report.status === 'ok' ? 200 : 503, message: report.status === 'ok' ? 'Healthy' : 'Degraded' });
  };
}
