import request from 'supertest';
import { createTestApp, type TestApp } from '../support/test-app.js';

const api = '/api/v1';

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
      },
    });
  });

  it('serves the editable pages from public/', async () => {
    const res = await request(app.server).get('/terms-and-conditions').expect(200);
    expect(res.text).toContain('Terms &amp; Conditions');
  });
});
