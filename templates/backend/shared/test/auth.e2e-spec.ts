import request from 'supertest';
import { createTestApp, type TestApp } from '../support/test-app.js';

const api = '/api/v1';

describe('auth API', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /auth/me requires a bearer token', async () => {
    const res = await request(app.server).get(`${api}/auth/me`).expect(401);
    expect(res.body).toMatchObject({ success: false, code: 'MISSING_TOKEN' });
  });
{{#if AUTH_EMAIL}}

  describe('email + password', () => {
    const user = { email: 'e2e@example.com', password: 'Sup3rSecret', name: 'E2E User', countryCode: '+91', phone: '9876543210' };
    let accessToken: string;
{{#if AUTH_REFRESH}}
    let refreshToken: string;
{{/if}}

    it('POST /auth/register creates an account (with mobile number)', async () => {
      const res = await request(app.server).post(`${api}/auth/register`).send(user).expect(201);

      expect(res.body).toMatchObject({ success: true, data: { user: { email: user.email, name: user.name, countryCode: '+91', phone: '9876543210', role: 'user', emailVerified: false, hasPassword: true } } });
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.tokens.tokenType).toBe('Bearer');
      accessToken = res.body.data.tokens.accessToken;
{{#if AUTH_REFRESH}}
      refreshToken = res.body.data.tokens.refreshToken;
{{/if}}
    });

    it('validates input and lists every invalid field', async () => {
      const res = await request(app.server).post(`${api}/auth/register`).send({ email: 'not-an-email', password: '1', phone: '123456' }).expect(422);
      expect(res.body).toMatchObject({ success: false, code: 'VALIDATION_ERROR' });
      const fields = res.body.errors.map((e: { field: string }) => e.field);
      expect(fields).toEqual(expect.arrayContaining(['email', 'password', 'name']));
    });

    it('rejects a duplicate email', async () => {
      const res = await request(app.server).post(`${api}/auth/register`).send({ ...user, phone: undefined, countryCode: undefined }).expect(409);
      expect(res.body.code).toBe('EMAIL_TAKEN');
    });

    it('POST /auth/login rejects wrong credentials', async () => {
      const res = await request(app.server).post(`${api}/auth/login`).send({ email: user.email, password: 'Wrong1234' }).expect(401);
      expect(res.body).toMatchObject({ success: false, code: 'INVALID_CREDENTIALS' });
    });

    it('POST /auth/login returns a session; GET /auth/me the user', async () => {
      const res = await request(app.server).post(`${api}/auth/login`).send({ email: user.email, password: user.password }).expect(200);
      accessToken = res.body.data.tokens.accessToken;
{{#if AUTH_REFRESH}}
      refreshToken = res.body.data.tokens.refreshToken;
{{/if}}
      const me = await request(app.server).get(`${api}/auth/me`).set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(me.body.data.email).toBe(user.email);
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

    it('verifies the email with the emailed code', async () => {
      const login = await request(app.server).post(`${api}/auth/login`).send({ email: user.email, password: user.password }).expect(200);
      const bearer = `Bearer ${login.body.data.tokens.accessToken}`;
      const res = await request(app.server).post(`${api}/auth/verify-email`).set('Authorization', bearer).send({ code: app.mailer.lastCode(user.email) }).expect(200);
      expect(res.body.data.emailVerified).toBe(true);
    });

    it('resets a forgotten password with the emailed code', async () => {
      app.repositories.verificationCodes.age(user.email);
      await request(app.server).post(`${api}/auth/forgot-password`).send({ email: user.email }).expect(200);
      const code = app.mailer.lastCode(user.email);

      await request(app.server).post(`${api}/auth/reset-password`).send({ email: user.email, code, newPassword: 'Brand5New' }).expect(200);
      await request(app.server).post(`${api}/auth/login`).send({ email: user.email, password: 'Brand5New' }).expect(200);
      const reuse = await request(app.server).post(`${api}/auth/reset-password`).send({ email: user.email, code, newPassword: 'Brand6New' }).expect(400);
      expect(reuse.body.code).toBe('INVALID_CODE');
    });
{{#if SEC_SANITIZE}}

    it('strips operator keys from the body', async () => {
      const res = await request(app.server).post(`${api}/auth/login`).send({ email: user.email, password: { $ne: null } }).expect(422);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
{{/if}}
  });
{{/if}}
{{#if AUTH_OTP}}

  describe('mobile number + SMS code', () => {
    const phone = { countryCode: '+44', phone: '7700 900123' };

    it('sends a code and signs in (creating the account)', async () => {
      const sent = await request(app.server).post(`${api}/auth/otp/send`).send(phone).expect(200);
      expect(sent.body.data).toMatchObject({ expiresIn: 600, resendIn: 60 });

      const res = await request(app.server)
        .post(`${api}/auth/otp/verify`)
        .send({ ...phone, otp: app.sms.lastCode('+447700900123'), name: 'Mobile User' })
        .expect(200);
      expect(res.body.data).toMatchObject({ isNewUser: true, user: { name: 'Mobile User', countryCode: '+44', phone: '7700900123', phoneVerified: true, email: null } });
    });

    it('rejects a wrong code and throttles resends', async () => {
      const res = await request(app.server).post(`${api}/auth/otp/verify`).send({ ...phone, otp: '000000' }).expect(400);
      expect(res.body.code).toBe('INVALID_CODE');
      const again = await request(app.server).post(`${api}/auth/otp/send`).send(phone).expect(429);
      expect(again.body.code).toBe('CODE_RESEND_TOO_SOON');
    });
  });
{{/if}}
{{#if SOCIAL}}

  describe('social sign-in', () => {
    it('POST /auth/social signs in with a provider token', async () => {
      const body = { provider: {{SOCIAL_PROVIDER}}, token: 'valid:provider-user-1:social@example.com', tokenType: 'idToken' };
      const res = await request(app.server).post(`${api}/auth/social`).send(body).expect(200);
      expect(res.body.data).toMatchObject({ isNewUser: true, user: { email: 'social@example.com', emailVerified: true, hasPassword: false } });
    });

    it('rejects a forged token', async () => {
      const res = await request(app.server).post(`${api}/auth/social`).send({ provider: {{SOCIAL_PROVIDER}}, token: 'forged-token-value', tokenType: 'idToken' }).expect(401);
      expect(res.body.code).toBe('INVALID_SOCIAL_TOKEN');
    });
  });
{{/if}}
});
