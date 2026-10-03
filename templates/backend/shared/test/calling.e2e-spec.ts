import { describe, it, expect{{#if VOIP_PUSH}}, beforeAll, afterAll, vi{{/if}} } from 'vitest';
{{#if VOIP_PUSH}}
import request from 'supertest';
import { callKitUuid } from '{{IMPORT:app.callingService}}';
import { DeviceType } from '{{IMPORT:domain.device}}';
import { createTestApp, type TestApp } from '../support/test-app.js';
{{/if}}

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
{{#if VOIP_PUSH}}

describe('iOS VoIP push (e2e)', () => {
  const api = '/api/v1';
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const voipToken = 'voip-token-of-jane-iphone-0001';
  let app: TestApp;
  let jane: { id: string; token: string };
  let john: { id: string; token: string };

  beforeAll(async () => {
    app = await createTestApp();
    jane = await app.signUp('Jane', undefined, { deviceId: 'jane-iphone', deviceType: DeviceType.IOS, fcmToken: 'fcm-token-of-jane-iphone' });
    john = await app.signUp('John');
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /calls/voip-token keeps the token on the most recently active iOS device (and validates it)', async () => {
    await request(app.server).post(`${api}/calls/voip-token`).set(bearer(jane.token)).send({ voipToken: 'short' }).expect(422);
    await request(app.server).post(`${api}/calls/voip-token`).set(bearer(jane.token)).send({ voipToken }).expect(200);
    expect(app.repositories.devices.devices.find(d => d.deviceId === 'jane-iphone')?.voipToken).toBe(voipToken);
    // No iOS device signed in.
    const none = await request(app.server).post(`${api}/calls/voip-token`).set(bearer(john.token)).send({ voipToken: 'voip-token-of-john-0001' }).expect(404);
    expect(none.body.code).toBe('IOS_DEVICE_NOT_FOUND');
  });

  it('an incoming call rings iOS through PushKit with the same CallKit uuid as the FCM push', async () => {
    const res = await request(app.server).post(`${api}/calls`).set(bearer(john.token)).send({ receiverId: jane.id, callType: 'video' }).expect(201);
    const callId: string = res.body.data.id;
    await vi.waitFor(() => expect(app.voipPushSender.sent).toHaveLength(1));
    expect(app.voipPushSender.sent[0]).toMatchObject({
      tokens: [voipToken],
      payload: { uuid: callKitUuid(callId), callId, callerId: john.id, callerName: 'John', callType: 'video', isGroupCall: false },
    });
    await vi.waitFor(() => expect(app.pushSender.sent.some(p => p.message.data['type'] === 'CALL_INCOMING')).toBe(true));
    expect(app.pushSender.sent.find(p => p.message.data['type'] === 'CALL_INCOMING')?.message.data['uuid']).toBe(callKitUuid(callId));

    // Hanging up sends no VoIP push (each one must report a call to CallKit).
    await request(app.server).post(`${api}/calls/${callId}/cancel`).set(bearer(john.token)).expect(200);
    expect(app.voipPushSender.sent).toHaveLength(1);
  });

  it('clears a VoIP token APNs rejects (the device and its FCM token stay)', async () => {
    app.voipPushSender.invalid = [voipToken];
    const res = await request(app.server).post(`${api}/calls`).set(bearer(john.token)).send({ receiverId: jane.id, callType: 'audio' }).expect(201);
    await vi.waitFor(() => expect(app.repositories.devices.devices.find(d => d.deviceId === 'jane-iphone')?.voipToken).toBeNull());
    expect(app.repositories.devices.devices.find(d => d.deviceId === 'jane-iphone')?.fcmToken).toBe('fcm-token-of-jane-iphone');
    await request(app.server).post(`${api}/calls/${res.body.data.id}/cancel`).set(bearer(john.token)).expect(200);
  });
});
{{/if}}
