import request from 'supertest';
import { createTestApp, type TestApp } from '../support/test-app.js';
import { DeviceType } from '{{IMPORT:domain.device}}';
import { UserRole } from '{{IMPORT:domain.roles}}';

const api = '/api/v1';
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('notifications API', () => {
  let app: TestApp;
  let user: { id: string; token: string };
  let admin: { id: string; token: string };

  beforeAll(async () => {
    app = await createTestApp();
{{#if DEVICE_INPUT}}
    // The device (and its FCM token) comes with the sign-in.
    user = await app.signUp('Jane', UserRole.USER, { deviceId: 'jane-phone-1', deviceType: DeviceType.ANDROID, fcmToken: 'fcm-token-of-jane' });
{{else}}
    user = await app.signUp('Jane');
    await app.repositories.devices.save(user.id, { deviceId: 'jane-phone-1', deviceType: DeviceType.ANDROID, fcmToken: 'fcm-token-of-jane' });
{{/if}}
    admin = await app.signUp('Admin', UserRole.ADMIN);
  });

  afterAll(async () => {
    await app.close();
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

  it('admins delete one broadcast or all of them – also from the inboxes', async () => {
    const send = (title: string) => request(app.server).post(`${api}/notifications/broadcast`).set(bearer(admin.token)).send({ title, body: '…' }).expect(201);
    const first = (await send('Old news')).body.data.id;
    await send('Newer news');

    await request(app.server).delete(`${api}/notifications/broadcasts/${first}`).set(bearer(user.token)).expect(403);
    await request(app.server).delete(`${api}/notifications/broadcasts`).set(bearer(user.token)).expect(403);

    await request(app.server).delete(`${api}/notifications/broadcasts/${first}`).set(bearer(admin.token)).expect(200);
    await request(app.server).delete(`${api}/notifications/broadcasts/${first}`).set(bearer(admin.token)).expect(404);
    let inbox = await request(app.server).get(`${api}/notifications`).set(bearer(user.token)).expect(200);
    expect(inbox.body.data.map((n: { title: string }) => n.title)).toEqual(['Newer news']);

    const cleared = await request(app.server).delete(`${api}/notifications/broadcasts`).set(bearer(admin.token)).expect(200);
    expect(cleared.body.data).toEqual({ count: 2 });
    inbox = await request(app.server).get(`${api}/notifications`).set(bearer(user.token)).expect(200);
    expect(inbox.body.data).toEqual([]);
    const history = await request(app.server).get(`${api}/notifications/broadcasts`).set(bearer(admin.token)).expect(200);
    expect(history.body.meta.total).toBe(0);
  });
});
