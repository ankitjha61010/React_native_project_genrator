import request from 'supertest';
import { createTestApp, type TestApp } from '../support/test-app.js';
{{#if AUTH}}
import { UserRole } from '{{IMPORT:domain.roles}}';
{{/if}}

const api = '/api/v1';
{{#if AUTH}}
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
{{/if}}

describe('legal API', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /legal returns the links the app opens (no sign-in needed)', async () => {
    const res = await request(app.server).get(`${api}/legal`).expect(200);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        termsUrl: expect.stringMatching(/\/terms-and-conditions$/),
        privacyPolicyUrl: expect.stringMatching(/\/privacy-policy$/),
{{#if DELETE_ACCOUNT}}
        deleteAccountUrl: expect.stringMatching(/\/delete-account$/),
{{/if}}
        termsHtml: null,
      },
    });
  });

  it('serves the editable pages from public/', async () => {
    const res = await request(app.server).get('/terms-and-conditions').expect(200);
    expect(res.text).toContain('Terms &amp; Conditions');
  });
{{#if AUTH}}

  it('PUT /legal is for admins only', async () => {
    const user = await app.signUp('Jane User');
    await request(app.server).put(`${api}/legal`).send({ termsHtml: '<p>x</p>' }).expect(401);
    await request(app.server).put(`${api}/legal`).set(bearer(user.token)).send({ termsHtml: '<p>x</p>' }).expect(403);
  });

  it('an admin saves links + pages, the app and the web page use them', async () => {
    const admin = await app.signUp('Ada Admin', UserRole.ADMIN);
    const res = await request(app.server)
      .put(`${api}/legal`)
      .set(bearer(admin.token))
      .send({ privacyPolicyUrl: 'https://example.com/privacy', termsHtml: '<h1>Our terms</h1>' })
      .expect(200);
    expect(res.body.data).toMatchObject({ privacyPolicyUrl: 'https://example.com/privacy', termsHtml: '<h1>Our terms</h1>' });

    const page = await request(app.server).get('/terms-and-conditions').expect(200);
    expect(page.text).toBe('<h1>Our terms</h1>');

    // An empty value resets it to the default.
    await request(app.server).put(`${api}/legal`).set(bearer(admin.token)).send({ privacyPolicyUrl: '', termsHtml: '' }).expect(200);
    const after = await request(app.server).get(`${api}/legal`).expect(200);
    expect(after.body.data).toMatchObject({ privacyPolicyUrl: expect.stringMatching(/\/privacy-policy$/), termsHtml: null });
  });

  it('rejects a link that is not a URL', async () => {
    const admin = await app.signUp('Ada Admin', UserRole.ADMIN);
    await request(app.server).put(`${api}/legal`).set(bearer(admin.token)).send({ termsUrl: 'not a url' }).expect(422);
  });
{{/if}}
});
