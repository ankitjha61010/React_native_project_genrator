import request from 'supertest';
import { createTestApp, type TestApp } from '../support/test-app.js';
{{#if AUTH}}
import { UserRole } from '{{IMPORT:domain.roles}}';
{{/if}}

const api = '/api/v1';
{{#if AUTH}}
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
{{/if}}

describe('users API', () => {
  let app: TestApp;
{{#if AUTH}}
  let user: { id: string; token: string };
  let admin: { id: string; token: string };
{{/if}}

  beforeAll(async () => {
    app = await createTestApp();
{{#if AUTH}}
    user = await app.signUp('Jane User');
    admin = await app.signUp('Ada Admin', UserRole.ADMIN);
{{/if}}
  });

  afterAll(async () => {
    await app.close();
  });
{{#if AUTH}}

  it('PATCH /users/me updates the profile (Edit Profile screen)', async () => {
    const res = await request(app.server)
      .patch(`${api}/users/me`)
      .set(bearer(user.token))
      .send({ name: 'Jane Doe', countryCode: '+91', phone: '98765 43210', location: 'Pune', bio: 'Hello' })
      .expect(200);
    expect(res.body.data).toMatchObject({ name: 'Jane Doe', countryCode: '+91', phone: '9876543210', location: 'Pune', bio: 'Hello', phoneVerified: false });
  });

  it('POST /users/me/avatar uploads a picture (multipart)', async () => {
    const res = await request(app.server)
      .post(`${api}/users/me/avatar`)
      .set(bearer(user.token))
      .attach('avatar', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), { filename: 'me.jpg', contentType: 'image/jpeg' })
      .expect(200);
    expect(res.body.data.avatar).toMatch(/^http:\/\/localhost:3000\/uploads\/avatars\//);

    const wrong = await request(app.server).post(`${api}/users/me/avatar`).set(bearer(user.token)).attach('avatar', Buffer.from('%PDF'), { filename: 'x.pdf', contentType: 'application/pdf' }).expect(400);
    expect(wrong.body.code).toBe('INVALID_FILE_TYPE');
    const missing = await request(app.server).post(`${api}/users/me/avatar`).set(bearer(user.token)).expect(422);
    expect(missing.body.errors[0].field).toBe('avatar');
  });

  it('POST / DELETE /users/:id/avatar – an admin changes a user\'s picture (permission users:write)', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    await request(app.server).post(`${api}/users/${admin.id}/avatar`).set(bearer(user.token)).attach('avatar', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' }).expect(403);
    const res = await request(app.server)
      .post(`${api}/users/${user.id}/avatar`)
      .set(bearer(admin.token))
      .attach('avatar', jpeg, { filename: 'jane.jpg', contentType: 'image/jpeg' })
      .expect(200);
    expect(res.body.data).toMatchObject({ id: user.id, avatar: expect.stringMatching(/\/uploads\/avatars\//) });
    const removed = await request(app.server).delete(`${api}/users/${user.id}/avatar`).set(bearer(admin.token)).expect(200);
    expect(removed.body.data.avatar).toBeNull();
  });

  it('GET /users/search lists other users (paginated), filtered by name', async () => {
    const all = await request(app.server).get(`${api}/users/search?page=1&limit=20`).set(bearer(user.token)).expect(200);
    expect(all.body.data).toEqual([{ id: admin.id, name: 'Ada Admin', avatar: null }]);
    expect(all.body.meta).toMatchObject({ page: 1, total: 1, hasNextPage: false });
    const filtered = await request(app.server).get(`${api}/users/search?search=nobody`).set(bearer(user.token)).expect(200);
    expect(filtered.body.data).toEqual([]);
  });

  it('requires authentication and the users:read permission', async () => {
    await request(app.server).get(`${api}/users`).expect(401);
    const res = await request(app.server).get(`${api}/users`).set(bearer(user.token)).expect(403);
    expect(res.body).toMatchObject({ success: false, code: 'FORBIDDEN' });
  });

  it('lets an admin list users with pagination meta', async () => {
    const res = await request(app.server).get(`${api}/users?page=1&limit=1`).set(bearer(admin.token)).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 1, total: 2, totalPages: 2, hasNextPage: true });
  });

  it('validates query parameters', async () => {
    const res = await request(app.server).get(`${api}/users?limit=1000`).set(bearer(admin.token)).expect(422);
    expect(res.body.errors[0].field).toBe('query.limit');
  });

  it('returns 404 for an unknown user', async () => {
    const res = await request(app.server).get(`${api}/users/unknown-id`).set(bearer(admin.token)).expect(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

{{#if DELETE_ACCOUNT}}

  it('DELETE /users/me deletes the account', async () => {
    const temp = await app.signUp('Temp');
    await request(app.server).delete(`${api}/users/me`).set(bearer(temp.token)).expect(200);
    await request(app.server).get(`${api}/auth/me`).set(bearer(temp.token)).expect(401);
  });
{{/if}}
{{else}}

  it('creates, reads, lists, updates and deletes users', async () => {
    const created = await request(app.server).post(`${api}/users`).send({ email: 'Ada@Example.com', name: 'Ada' }).expect(201);
    const id = created.body.data.id;
    expect(created.body.data.email).toBe('ada@example.com');

    await request(app.server).get(`${api}/users/${id}`).expect(200);
    const list = await request(app.server).get(`${api}/users`).expect(200);
    expect(list.body.meta.total).toBe(1);

    const updated = await request(app.server).patch(`${api}/users/${id}`).send({ name: 'Ada L.' }).expect(200);
    expect(updated.body.data.name).toBe('Ada L.');

    await request(app.server).delete(`${api}/users/${id}`).expect(200);
    await request(app.server).get(`${api}/users/${id}`).expect(404);
  });

  it('rejects invalid input', async () => {
    const res = await request(app.server).post(`${api}/users`).send({ email: 'nope' }).expect(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a duplicate email', async () => {
    await request(app.server).post(`${api}/users`).send({ email: 'dup@example.com', name: 'A' }).expect(201);
    await request(app.server).post(`${api}/users`).send({ email: 'dup@example.com', name: 'B' }).expect(409);
  });
{{/if}}
});
