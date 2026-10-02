import type { Request, Response } from 'express';
import type { OTAService } from '{{IMPORT:app.otaService}}';
import { NotFoundError } from '{{IMPORT:core.errors}}';
import { sendSuccess } from '{{IMPORT:ex.respond}}';
import { parseBody, parseParams, parseQuery } from '{{IMPORT:ex.validation}}';
import { checkUpdateQuerySchema, createReleaseBodySchema, downloadEventBodySchema, releaseParams } from '{{IMPORT:ex.ota.schemas}}';
import { OTA_MESSAGES } from '{{IMPORT:messages.ota}}';

/** Handles `/ota`: update checks + telemetry from the app, releases from the admin panel. */
export class OTAController {
  constructor(private readonly ota: OTAService) {}

  /** GET /ota/check */
  check = async (req: Request, res: Response) => {
    const query = parseQuery(checkUpdateQuerySchema, req);
    sendSuccess(res, OTA_MESSAGES.check, await this.ota.checkUpdate(query));
  };

  /** POST /ota/download-event */
  downloadEvent = async (req: Request, res: Response) => {
    const body = parseBody(downloadEventBodySchema, req);
    await this.ota.recordDownloadEvent(body);
    sendSuccess(res, OTA_MESSAGES.eventRecorded);
  };

  /** GET /ota/releases (admin) */
  listReleases = async (_req: Request, res: Response) => {
    sendSuccess(res, OTA_MESSAGES.releasesList, await this.ota.listReleases());
  };

  /** POST /ota/releases (admin) */
  createRelease = async (req: Request, res: Response) => {
    const body = parseBody(createReleaseBodySchema, req);
    const release = await this.ota.createRelease({
      version: body.otaVersion,
      nativeVersion: body.nativeVersion,
      platform: body.platform,
      bundleUrl: body.bundleUrl,
      bundleSize: body.bundleSize,
      sha256: body.sha256,
      signature: body.signature,
      forceUpdate: body.forceUpdate,
      releaseNotes: body.releaseNotes ?? null,
      targetRolloutPct: body.targetRolloutPct,
      status: 'active',
    });
    sendSuccess(res, OTA_MESSAGES.releaseCreated, release, { status: 201 });
  };

  /** POST /ota/releases/:id/rollback (admin) */
  rollback = async (req: Request, res: Response) => {
    const { id } = parseParams(releaseParams, req);
    const release = await this.ota.rollbackRelease(id);
    if (!release) throw new NotFoundError(OTA_MESSAGES.notFound);
    sendSuccess(res, OTA_MESSAGES.rolledBack, release);
  };
}
