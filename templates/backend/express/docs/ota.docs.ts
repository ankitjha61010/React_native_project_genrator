import { z } from 'zod';
import type { ApiDocGroup } from '{{IMPORT:ex.docs.helpers}}';
import { checkUpdateQuerySchema, createReleaseBodySchema, downloadEventBodySchema, otaCheckResponseSchema, otaReleaseSchema, releaseParams } from '{{IMPORT:ex.ota.schemas}}';

/** Swagger docs of ota.routes.ts. */
export const otaDocs: ApiDocGroup = {
  tag: 'OTA Updates',
  endpoints: [
    { method: 'get', path: '/ota/check', summary: 'Check for an Over-The-Air update', query: checkUpdateQuerySchema, response: otaCheckResponseSchema, errors: [422] },
    { method: 'post', path: '/ota/download-event', summary: 'Report a download / apply event', body: downloadEventBodySchema, errors: [422] },
    { method: 'get', path: '/ota/releases', summary: 'Published OTA releases (admin)', auth: true, response: z.array(otaReleaseSchema), errors: [401, 403] },
    { method: 'post', path: '/ota/releases', summary: 'Publish an OTA bundle (admin)', auth: true, body: createReleaseBodySchema, response: otaReleaseSchema, status: 201, errors: [401, 403, 422] },
    { method: 'post', path: '/ota/releases/:id/rollback', summary: 'Roll back a release (admin)', auth: true, params: releaseParams, response: otaReleaseSchema, errors: [401, 403, 404] },
  ],
};
