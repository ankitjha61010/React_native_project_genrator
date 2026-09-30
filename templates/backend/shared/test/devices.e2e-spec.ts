import request from 'supertest';
import { DeviceType } from '{{IMPORT:domain.device}}';
{{#if DEVICE_INPUT}}
import { UserRole } from '{{IMPORT:domain.roles}}';
{{/if}}
import { createTestApp, type TestApp } from '../support/test-app.js';

const api = '/api/v1';
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('devices API', () => {
  let app: TestApp;
  let user: { id: string; token: string };

  beforeAll(async () => {
    app = await createTestApp();
    user = await app.signUp('Jane');
  });

  afterAll(async () => {
    await app.close();
  });
{{#if DEVICE_INPUT}}

  it('saves the device sent with the sign-in – no separate request – and removes it on logout', async () => {
    const device = { deviceId: 'john-phone-1', deviceType: DeviceType.ANDROID, deviceModel: 'Google Pixel 8', osVersion: '15', appVersion: '1.0.0', fcmToken: 'fcm-token-of-john' };
    const john = await app.signUp('John', UserRole.USER, device);
    const list = await request(app.server).get(`${api}/devices`).set(bearer(john.token)).expect(200);
    expect(list.body.data).toEqual([expect.objectContaining({ deviceId: 'john-phone-1', deviceType: 'ANDROID', deviceModel: 'Google Pixel 8', pushEnabled: true })]);

{{#if AUTH_REFRESH}}
    await request(app.server).post(`${api}/auth/logout`).send({ refreshToken: john.refreshToken, deviceId: 'john-phone-1' }).expect(200);
{{else}}
    await request(app.server).post(`${api}/auth/logout`).set(bearer(john.token)).send({ deviceId: 'john-phone-1' }).expect(200);
{{/if}}
    expect(app.repositories.devices.devices.filter(d => d.userId === john.id)).toHaveLength(0);
  });
{{/if}}

  it('PATCH /devices/:deviceId updates a rotated FCM token (and validates it)', async () => {
    await app.repositories.devices.save(user.id, { deviceId: 'jane-phone-1', deviceType: DeviceType.IOS });
    const res = await request(app.server).patch(`${api}/devices/jane-phone-1`).set(bearer(user.token)).send({ fcmToken: 'fcm-token-of-jane' }).expect(200);
    expect(res.body).toMatchObject({ success: true, data: { deviceId: 'jane-phone-1', deviceType: 'IOS', pushEnabled: true } });

    const invalid = await request(app.server).patch(`${api}/devices/jane-phone-1`).set(bearer(user.token)).send({ fcmToken: 'x' }).expect(422);
    expect(invalid.body).toMatchObject({ success: false, data: null, code: 'VALIDATION_ERROR' });
    await request(app.server).patch(`${api}/devices/someone-else`).set(bearer(user.token)).send({ fcmToken: 'fcm-token-of-jane' }).expect(404);
  });

  it('GET /devices lists every device of the user', async () => {
    await app.repositories.devices.save(user.id, { deviceId: 'jane-tablet-1', deviceType: DeviceType.IOS });
    const list = await request(app.server).get(`${api}/devices`).set(bearer(user.token)).expect(200);
    expect(list.body.data.map((d: { deviceId: string }) => d.deviceId).toSorted()).toEqual(['jane-phone-1', 'jane-tablet-1']);
  });

  it('needs a signed-in user', async () => {
    await request(app.server).get(`${api}/devices`).expect(401);
  });
});
