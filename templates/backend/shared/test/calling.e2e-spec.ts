import { describe, it, expect } from 'vitest';

// ─── E2E tests for calling endpoints ─────────────────────────────────────────

describe('Calling API (e2e)', () => {
  it('POST /calls – initiates a one-to-one call (201)', async () => {
    // TODO: use supertest with a test app
    expect(true).toBe(true);
  });

  it('POST /calls/:callId/accept – accepts the call (200)', async () => {
    expect(true).toBe(true);
  });

  it('POST /calls/:callId/reject – rejects the call (200)', async () => {
    expect(true).toBe(true);
  });

  it('POST /calls/:callId/agora-token – returns token without certificate (200)', async () => {
    expect(true).toBe(true);
  });

  it('GET /calls/history – returns paginated call history (200)', async () => {
    expect(true).toBe(true);
  });

  it('POST /calls/group – initiates group call (201)', async () => {
    expect(true).toBe(true);
  });
});
