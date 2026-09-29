import request from 'supertest';
import { createTestApp, type TestApp } from '../support/test-app.js';

const api = '/api/v1';
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('notifications API', () => {
  let app: TestApp;
  let user: { id: string; token: string };
  let admin: { id: string; token: string };

  beforeAll(async () => {
    app = await createTestApp();
    user = await app.signUp('Jane');
    admin = await app.signUp('Admin', 'admin');
  });

  afterAll(async () => {
    await app.close();
  });

  it('pushes to the devices registered with POST /devices', async () => {
    await request(app.server).post(`${api}/devices`).set(bearer(user.token)).send({ deviceId: 'jane-phone-1', token: 'fcm-token-of-jane', platform: 'android' }).expect(200);
  });

  it('only admins may broadcast', async () => {
    await request(app.server).post(`${api}/notifications/broadcast`).set(bearer(user.token)).send({ title: 'Hi', body: 'All' }).expect(403);
  });

  it('POST /notifications/broadcast reaches every user (inbox + push)', async () => {
    const res = await request(app.server)
      .post(`${api}/notifications/broadcast`)
      .set(bearer(admin.token))
      .send({ title: 'Big news', body: 'Version 2 is out', type: 'promotion', data: { url: 'https://example.com/v2' } })
      .expect(201);
    expect(res.body.data).toMatchObject({ title: 'Big news', audience: 'all', recipientCount: 2 });
    expect(app.pushSender.sent.at(-1)).toMatchObject({ tokens: ['fcm-token-of-jane'], message: { title: 'Big news', data: { type: 'promotion', url: 'https://example.com/v2' } } });

    const history = await request(app.server).get(`${api}/notifications/broadcasts`).set(bearer(admin.token)).expect(200);
    expect(history.body.meta.total).toBe(1);
  });

  it('GET /notifications lists the inbox with meta.unreadCount', async () => {
    const res = await request(app.server).get(`${api}/notifications`).set(bearer(user.token)).expect(200);
    expect(res.body.data).toEqual([expect.objectContaining({ title: 'Big news', type: 'promotion', read: false, data: { url: 'https://example.com/v2' } })]);
    expect(res.body.meta).toMatchObject({ total: 1, unreadCount: 1 });
  });

  it('marks read, counts and deletes', async () => {
    const list = await request(app.server).get(`${api}/notifications`).set(bearer(user.token)).expect(200);
    const id = list.body.data[0].id;

    await request(app.server).patch(`${api}/notifications/${id}/read`).set(bearer(user.token)).expect(200);
    const count = await request(app.server).get(`${api}/notifications/unread-count`).set(bearer(user.token)).expect(200);
    expect(count.body.data).toEqual({ count: 0 });

    await request(app.server).patch(`${api}/notifications/${id}/read`).set(bearer(admin.token)).expect(404);
    await request(app.server).delete(`${api}/notifications/${id}`).set(bearer(user.token)).expect(200);
    await request(app.server).post(`${api}/notifications/read-all`).set(bearer(user.token)).expect(200);
    await request(app.server).delete(`${api}/notifications`).set(bearer(user.token)).expect(200);
  });
});
