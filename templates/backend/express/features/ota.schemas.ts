import { z } from 'zod';

export const checkUpdateQuerySchema = z.object({
  native_version: z.string(),
  ota_version: z.coerce.number().default(0),
  platform: z.string(),
  device_id: z.string().optional(),
  ota_status: z.string().optional(),
});

export const downloadEventBodySchema = z
  .object({
    device_id: z.string(),
    ota_version: z.coerce.number(),
    event: z.string(),
    platform: z.string().optional(),
  })
  .meta({ id: 'OtaDownloadEventRequest' });

export const createReleaseBodySchema = z
  .object({
    nativeVersion: z.string(),
    otaVersion: z.number().min(1),
    platform: z.enum(['ios', 'android', 'all']),
    bundleUrl: z.url(),
    bundleSize: z.number().positive(),
    sha256: z.string().min(32),
    signature: z.string().min(16),
    forceUpdate: z.boolean().default(false),
    releaseNotes: z.string().optional(),
    targetRolloutPct: z.number().min(1).max(100).default(100),
  })
  .meta({ id: 'CreateOtaReleaseRequest' });

export const releaseParams = z.object({ id: z.string().min(1).max(64) });

// ── responses (used by the OpenAPI document) ──────────────────────────────────

export const otaCheckResponseSchema = z
  .object({
    update_available: z.boolean(),
    ota_version: z.number().optional(),
    bundle_url: z.string().optional(),
    bundle_size: z.number().optional(),
    sha256: z.string().optional(),
    signature: z.string().optional(),
    force_update: z.boolean().optional(),
    release_notes: z.string().optional(),
    revert_to_embedded: z.boolean().optional(),
  })
  .meta({ id: 'OtaCheckResult' });

export const otaReleaseSchema = z
  .object({
    id: z.string(),
    version: z.number(),
    nativeVersion: z.string(),
    platform: z.enum(['ios', 'android', 'all']),
    bundleUrl: z.string(),
    bundleSize: z.number(),
    sha256: z.string(),
    signature: z.string(),
    forceUpdate: z.boolean(),
    releaseNotes: z.string().nullable(),
    targetRolloutPct: z.number(),
    status: z.enum(['active', 'rolled_back', 'draft']),
    downloadCount: z.number(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'OtaRelease' });
