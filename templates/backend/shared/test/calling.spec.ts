import { describe, it, expect } from 'vitest';
import { CallingService, callKitUuid } from '{{IMPORT:app.callingService}}';

// ─── In-memory stub repository for unit tests ────────────────────────────────

describe('CallingService – unit', () => {
  it('should be defined', () => {
    expect(CallingService).toBeDefined();
  });

  it('callKitUuid: the same UUID for every delivery of a call (never random)', () => {
    // UUID call ids are used as they are (lowercased).
    expect(callKitUuid('3F2504E0-4F89-41D3-9A0C-0305E82C3301')).toBe('3f2504e0-4f89-41d3-9a0c-0305e82c3301');
    // Other ids (e.g. MongoDB ObjectIds) get a stable name-based UUID.
    const uuid = callKitUuid('65f1c0ffee0000000000abcd');
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(callKitUuid('65f1c0ffee0000000000abcd')).toBe(uuid);
    expect(callKitUuid('65f1c0ffee0000000000abce')).not.toBe(uuid);
  });

  // TODO: Add unit tests for:
  // - initiateCall: busy receiver returns 409
  // - acceptCall: wrong state returns conflict
  // - rejectCall: marks call as declined
  // - endCall: calculates duration
  // - endCallForAll: non-host returns 403
  // - generateAgoraToken: returns token + appId (never certificate)
  // - getCallHistory: paginates correctly
  // - markMissed: called after timeout
});
