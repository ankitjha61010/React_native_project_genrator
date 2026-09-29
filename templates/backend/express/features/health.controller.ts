import type { Request, Response } from 'express';
import type { HealthService } from '{{IMPORT:app.healthService}}';
import { sendSuccess } from '{{IMPORT:ex.respond}}';
import { HEALTH_MESSAGES } from '{{IMPORT:messages.health}}';

/** Handles `/health`. */
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** GET /health – 200 when every dependency is up, 503 when one is down */
  check = async (_req: Request, res: Response) => {
    const report = await this.health.check();
    sendSuccess(res, HEALTH_MESSAGES.status, report, { status: report.status === 'ok' ? 200 : 503 });
  };
}
