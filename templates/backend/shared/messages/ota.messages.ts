/** Messages of the OTA feature – change wording here. */
export const OTA_MESSAGES = {
  check: 'OTA update check result',
  eventRecorded: 'OTA event recorded',
  releaseCreated: 'OTA release published',
  releasesList: 'OTA releases',
  rolledBack: 'OTA release rolled back',
  // ── errors ─────────────────────────────────────────────────────────────────
  notFound: { message: 'OTA release not found', code: 'OTA_RELEASE_NOT_FOUND' },
} as const;
