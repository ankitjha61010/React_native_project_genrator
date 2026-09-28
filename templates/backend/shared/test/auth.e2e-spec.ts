import request from 'supertest';
import { createTestApp, type TestApp } from '../support/test-app.js';

const api = '/api/v1';
const user = { email: 'e2e@example.com', password: 'Sup3rSecret', name: 'E2E User' };

describe('auth API', () => {
  let app: TestApp;
  let accessToken: string;
{{#if AUTH_REFRESH}}
  let refreshToken: string;
{{/if}}

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register creates an account', async () => {
    const res = await request(app.server).post(`${api}/auth/register`).send(user).expect(201);

    expect(res.body).toMatchObject({ success: true, data: { user: { email: user.email, name: user.name, role: 'user', emailVerified: false } } });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.tokens.tokenType).toBe('Bearer');
    accessToken = res.body.data.tokens.accessToken;
{{#if AUTH_REFRESH}}
    refreshToken = res.body.data.tokens.refreshToken;
{{/if}}
  });

  it('validates input and lists every invalid field', async () => {
    const res = await request(app.server).post(`${api}/auth/register`).send({ email: 'not-an-email', password: '1' }).expect(422);

    expect(res.body).toMatchObject({ success: false, code: 'VALIDATION_ERROR' });
    const fields = res.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password', 'name']));
  });

  it('rejects a duplicate email', async () => {
    const res = await request(app.server).post(`${api}/auth/register`).send(user).expect(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('POST /auth/login rejects wrong credentials', async () => {
    const res = await request(app.server).post(`${api}/auth/login`).send({ email: user.email, password: 'Wrong1234' }).expect(401);
    expect(res.body).toMatchObject({ success: false, code: 'INVALID_CREDENTIALS' });
  });

  it('POST /auth/login returns a session', async () => {
    const res = await request(app.server).post(`${api}/auth/login`).send({ email: user.email, password: user.password }).expect(200);
    accessToken = res.body.data.tokens.accessToken;
{{#if AUTH_REFRESH}}
    refreshToken = res.body.data.tokens.refreshToken;
{{/if}}
  });

  it('GET /auth/me requires a bearer token', async () => {
    const res = await request(app.server).get(`${api}/auth/me`).expect(401);
    expect(res.body).toMatchObject({ success: false, code: 'MISSING_TOKEN' });
  });

  it('GET /auth/me returns the signed-in user', async () => {
    const res = await request(app.server).get(`${api}/auth/me`).set('Authorization', `Bearer ${accessToken}`).expect(200);
    expect(res.body.data.email).toBe(user.email);
  });
{{#if AUTH_REFRESH}}

  it('POST /auth/refresh issues new tokens', async () => {
    const res = await request(app.server).post(`${api}/auth/refresh`).send({ refreshToken }).expect(200);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
{{#if AUTH_ROTATION}}

    // The old refresh token was rotated – using it again is treated as theft.
    const reuse = await request(app.server).post(`${api}/auth/refresh`).send({ refreshToken }).expect(401);
    expect(reuse.body.code).toBe('TOKEN_REUSED');
{{else}}
    expect(res.body.data.tokens.refreshToken).toBe(refreshToken);
{{/if}}
  });

  it('POST /auth/logout ends the session', async () => {
    const login = await request(app.server).post(`${api}/auth/login`).send({ email: user.email, password: user.password }).expect(200);
    const token = login.body.data.tokens.refreshToken;

    await request(app.server).post(`${api}/auth/logout`).send({ refreshToken: token }).expect(200);
    await request(app.server).post(`${api}/auth/refresh`).send({ refreshToken: token }).expect(401);
  });
{{else}}

  it('POST /auth/logout invalidates the token', async () => {
    await request(app.server).post(`${api}/auth/logout`).set('Authorization', `Bearer ${accessToken}`).expect(200);
    const res = await request(app.server).get(`${api}/auth/me`).set('Authorization', `Bearer ${accessToken}`).expect(401);
    expect(res.body.code).toBe('SESSION_REVOKED');
  });
{{/if}}

  it('resets a forgotten password with the emailed link', async () => {
    await request(app.server).post(`${api}/auth/forgot-password`).send({ email: user.email }).expect(200);
    const token = app.mailer.lastToken(user.email);

    await request(app.server).post(`${api}/auth/reset-password`).send({ token, newPassword: 'Brand5New' }).expect(200);
    await request(app.server).post(`${api}/auth/login`).send({ email: user.email, password: 'Brand5New' }).expect(200);
    const reuse = await request(app.server).post(`${api}/auth/reset-password`).send({ token, newPassword: 'Brand6New' }).expect(400);
    expect(reuse.body.code).toBe('INVALID_TOKEN');
  });

  it('verifies the email address', async () => {
    const login = await request(app.server).post(`${api}/auth/login`).send({ email: user.email, password: 'Brand5New' }).expect(200);
    await request(app.server)
      .post(`${api}/auth/verify-email/request`)
      .set('Authorization', `Bearer ${login.body.data.tokens.accessToken}`)
      .expect(200);

    const verified = await request(app.server).post(`${api}/auth/verify-email`).send({ token: app.mailer.lastToken(user.email) }).expect(200);
    expect(verified.body.data.emailVerified).toBe(true);
  });
{{#if SEC_SANITIZE}}

  it('strips operator keys from the body', async () => {
    const res = await request(app.server)
      .post(`${api}/auth/login`)
      .send({ email: user.email, password: { $ne: null } })
      .expect(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
{{/if}}
});
