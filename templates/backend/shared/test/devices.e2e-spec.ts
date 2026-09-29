import request from 'supertest';
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

  it('POST /devices registers this install (and validates it)', async () => {
    const res = await request(app.server)
      .post(`${api}/devices`)
      .set(bearer(user.token))
      .send({ deviceId: 'jane-phone-1', token: 'fcm-token-of-jane', platform: 'android', deviceName: 'Pixel 8', osVersion: '15', appVersion: '1.0.0' })
      .expect(200);
    expect(res.body).toMatchObject({ success: true, data: { deviceId: 'jane-phone-1', deviceName: 'Pixel 8', pushEnabled: true } });

    const invalid = await request(app.server).post(`${api}/devices`).set(bearer(user.token)).send({ deviceId: 'x', platform: 'windows' }).expect(422);
    expect(invalid.body).toMatchObject({ success: false, data: null, code: 'VALIDATION_ERROR' });
    expect(invalid.body.errors.map((e: { field: string }) => e.field)).toEqual(expect.arrayContaining(['deviceId', 'platform']));
  });

  it('GET /devices lists every device, DELETE /devices/:deviceId removes one (logout)', async () => {
    await request(app.server).post(`${api}/devices`).set(bearer(user.token)).send({ deviceId: 'jane-tablet-1', platform: 'ios' }).expect(200);
    const list = await request(app.server).get(`${api}/devices`).set(bearer(user.token)).expect(200);
    expect(list.body.data.map((d: { deviceId: string }) => d.deviceId).toSorted()).toEqual(['jane-phone-1', 'jane-tablet-1']);

    await request(app.server).delete(`${api}/devices/jane-tablet-1`).set(bearer(user.token)).expect(200);
    await request(app.server).delete(`${api}/devices/jane-tablet-1`).set(bearer(user.token)).expect(404);
    expect(app.repositories.devices.devices).toHaveLength(1);
  });

  it('needs a signed-in user', async () => {
    await request(app.server).get(`${api}/devices`).expect(401);
  });
});
