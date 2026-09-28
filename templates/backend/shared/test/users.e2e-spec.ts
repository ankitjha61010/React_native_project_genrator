import request from 'supertest';
import { createTestApp, type TestApp } from '../support/test-app.js';

const api = '/api/v1';

describe('users API', () => {
  let app: TestApp;
{{#if AUTH}}
  let userToken: string;
  let adminToken: string;
  let userId: string;

  const register = async (email: string) => {
    const res = await request(app.server).post(`${api}/auth/register`).send({ email, password: 'Sup3rSecret', name: email.split('@')[0] }).expect(201);
    return { id: res.body.data.user.id as string, token: res.body.data.tokens.accessToken as string };
  };
{{/if}}

  beforeAll(async () => {
    app = await createTestApp();
{{#if AUTH}}
    const user = await register('user@example.com');
    userToken = user.token;
    userId = user.id;

    const admin = await register('admin@example.com');
    await app.usersRepository.update(admin.id, { role: 'admin' });
    // Log in again so the access token carries the new role.
    const login = await request(app.server).post(`${api}/auth/login`).send({ email: 'admin@example.com', password: 'Sup3rSecret' }).expect(200);
    adminToken = login.body.data.tokens.accessToken;
{{/if}}
  });

  afterAll(async () => {
    await app.close();
  });
{{#if AUTH}}

  it('requires authentication', async () => {
    await request(app.server).get(`${api}/users`).expect(401);
  });

  it('forbids listing users without the users:read permission', async () => {
    const res = await request(app.server).get(`${api}/users`).set('Authorization', `Bearer ${userToken}`).expect(403);
    expect(res.body).toMatchObject({ success: false, code: 'FORBIDDEN' });
  });

  it('lets an admin list users with pagination meta', async () => {
    const res = await request(app.server).get(`${api}/users?page=1&limit=1`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 1, total: 2, totalPages: 2, hasNextPage: true });
  });

  it('validates query parameters', async () => {
    const res = await request(app.server).get(`${api}/users?limit=1000`).set('Authorization', `Bearer ${adminToken}`).expect(422);
    expect(res.body.errors[0].field).toBe('query.limit');
  });

  it('lets users update their own profile', async () => {
    const res = await request(app.server).patch(`${api}/users/me`).set('Authorization', `Bearer ${userToken}`).send({ name: 'Renamed' }).expect(200);
    expect(res.body.data.name).toBe('Renamed');
  });

  it('lets an admin change a role, which signs that user out', async () => {
    const res = await request(app.server)
      .patch(`${api}/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' })
      .expect(200);
    expect(res.body.data.role).toBe('admin');
    await request(app.server).get(`${api}/auth/me`).set('Authorization', `Bearer ${userToken}`).expect(401);
  });

  it('returns 404 for an unknown user', async () => {
    const res = await request(app.server).get(`${api}/users/unknown-id`).set('Authorization', `Bearer ${adminToken}`).expect(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });
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
