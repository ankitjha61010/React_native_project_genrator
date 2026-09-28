import { Controller, Get{{#if STYLE_USECASE}}, Inject{{/if}}, Res } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiOperation, ApiTags } from '@nestjs/swagger';
{{/if}}
import type { Response } from 'express';
{{#if STYLE_SERVICE}}
import { HealthService } from '{{IMPORT:app.healthService}}';
{{else}}
import type { HealthUseCases } from '{{IMPORT:nest.health.providers}}';
import { HEALTH_USE_CASES } from '{{IMPORT:nest.tokens}}';
{{/if}}
{{#if AUTH}}
import { Public, ResponseMessage } from '{{IMPORT:nest.decorators}}';
{{else}}
import { ResponseMessage } from '{{IMPORT:nest.decorators}}';
{{/if}}

{{#if SWAGGER}}
@ApiTags('Health')
{{/if}}
{{#if AUTH}}
@Public()
{{/if}}
@Controller('health')
export class HealthController {
  constructor({{#if STYLE_SERVICE}}private readonly health: HealthService{{else}}@Inject(HEALTH_USE_CASES) private readonly health: HealthUseCases{{/if}}) {}

  @Get()
{{#if SWAGGER}}
  @ApiOperation({ summary: 'Liveness / readiness (database connectivity) – 503 when degraded' })
{{/if}}
  @ResponseMessage('Health status')
  async check(@Res({ passthrough: true }) res: Response) {
    const report = await this.health.check{{CALL}}();
    if (report.status !== 'ok') res.status(503);
    return report;
  }
}
