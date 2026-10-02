import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiTags } from '@nestjs/swagger';
{{/if}}
import { OTAService } from '{{IMPORT:app.otaService}}';
import { NotFoundError } from '{{IMPORT:core.errors}}';
import { Public, RequirePermissions } from '{{IMPORT:nest.decorators}}';
import { Endpoint } from '{{IMPORT:nest.endpoint}}';
import { CheckUpdateQueryDto, CreateReleaseDto, DownloadEventDto, OtaCheckResultDto, OtaReleaseDto } from '{{IMPORT:nest.ota.dto}}';
import { OTA_MESSAGES } from '{{IMPORT:messages.ota}}';

/** `/ota` – update checks + telemetry (public, the app), releases (admin panel). */
{{#if SWAGGER}}
@ApiTags('OTA Updates')
{{/if}}
@Controller('ota')
export class OTAController {
  constructor(private readonly ota: OTAService) {}

  @Public()
  @Get('check')
  @Endpoint({ summary: 'Check for an Over-The-Air update', message: OTA_MESSAGES.check, response: OtaCheckResultDto, errors: [422] })
  check(@Query() query: CheckUpdateQueryDto) {
    return this.ota.checkUpdate({ ...query, ota_version: query.ota_version ?? 0 });
  }

  @Public()
  @Post('download-event')
  @Endpoint({ summary: 'Report a download / apply event', message: OTA_MESSAGES.eventRecorded, status: 200, response: null, errors: [422] })
  async downloadEvent(@Body() dto: DownloadEventDto) {
    await this.ota.recordDownloadEvent(dto);
  }

  @Get('releases')
  @RequirePermissions('ota:read')
  @Endpoint({ summary: 'Published OTA releases (admin)', message: OTA_MESSAGES.releasesList, response: OtaReleaseDto, array: true, errors: [401, 403], bearer: true })
  listReleases() {
    return this.ota.listReleases();
  }

  @Post('releases')
  @RequirePermissions('ota:write')
  @Endpoint({ summary: 'Publish an OTA bundle (admin)', message: OTA_MESSAGES.releaseCreated, status: 201, response: OtaReleaseDto, errors: [401, 403, 422], bearer: true })
  createRelease(@Body() dto: CreateReleaseDto) {
    return this.ota.createRelease({
      version: dto.otaVersion,
      nativeVersion: dto.nativeVersion,
      platform: dto.platform,
      bundleUrl: dto.bundleUrl,
      bundleSize: dto.bundleSize,
      sha256: dto.sha256,
      signature: dto.signature,
      forceUpdate: dto.forceUpdate,
      releaseNotes: dto.releaseNotes ?? null,
      targetRolloutPct: dto.targetRolloutPct ?? 100,
      status: 'active',
    });
  }

  @Post('releases/:id/rollback')
  @RequirePermissions('ota:write')
  @Endpoint({ summary: 'Roll back a release (admin)', message: OTA_MESSAGES.rolledBack, status: 200, response: OtaReleaseDto, errors: [401, 403, 404], bearer: true })
  async rollback(@Param('id') id: string) {
    const release = await this.ota.rollbackRelease(id);
    if (!release) throw new NotFoundError(OTA_MESSAGES.notFound);
    return release;
  }
}
