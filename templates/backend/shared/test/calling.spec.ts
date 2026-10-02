import { describe, it, expect } from 'vitest';
import { CallingService } from '{{IMPORT:app.callingService}}';

// ─── In-memory stub repository for unit tests ────────────────────────────────

describe('CallingService – unit', () => {
  it('should be defined', () => {
    expect(CallingService).toBeDefined();
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
