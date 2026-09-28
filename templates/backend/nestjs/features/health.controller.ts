import { Controller, Get, Res } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiTags } from '@nestjs/swagger';
{{/if}}
import type { Response } from 'express';
import { HealthService } from '{{IMPORT:app.healthService}}';
{{#if AUTH}}
import { Public } from '{{IMPORT:nest.decorators}}';
{{/if}}
import { Endpoint } from '{{IMPORT:nest.endpoint}}';

{{#if SWAGGER}}
@ApiTags('Health')
{{/if}}
{{#if AUTH}}
@Public()
{{/if}}
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Endpoint({ summary: 'Liveness / readiness (database connectivity) – 503 when degraded', message: 'Health status', errors: [503] })
  async check(@Res({ passthrough: true }) res: Response) {
    const report = await this.health.check();
    if (report.status !== 'ok') res.status(503);
    return report;
  }
}
