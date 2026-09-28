import request from 'supertest';
import { createTestApp, type TestApp } from '../support/test-app.js';

describe('GET /api/v1/health', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports ok in the standard envelope', async () => {
    const res = await request(app.server).get('/api/v1/health').expect(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok', checks: { database: 'up' } } });
    expect(res.headers['x-request-id']).toBeTruthy();
{{#if SEC_HELMET}}
    expect(res.headers['x-content-type-options']).toBe('nosniff');
{{/if}}
  });

  it('answers 503 when the database is down', async () => {
    app.healthCheck.healthy = false;
    const res = await request(app.server).get('/api/v1/health').expect(503);
    expect(res.body.data).toMatchObject({ status: 'degraded', checks: { database: 'down' } });
    app.healthCheck.healthy = true;
  });

  it('answers unknown routes with the error envelope', async () => {
    const res = await request(app.server).get('/api/v1/does-not-exist').expect(404);
    expect(res.body).toMatchObject({ success: false, errors: [] });
    expect(typeof res.body.code).toBe('string');
  });
{{#if SWAGGER}}

  it('serves the OpenAPI document', async () => {
    const res = await request(app.server).get('/api/docs/openapi.json').expect(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(0);
  });
{{/if}}
{{#if SEC_BODY_LIMIT}}

  it('rejects bodies over the size limit', async () => {
    const res = await request(app.server)
      .post('/api/v1/{{#if AUTH}}auth/login{{else}}users{{/if}}')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ padding: 'x'.repeat(2 * 1024 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({ success: false, code: 'PAYLOAD_TOO_LARGE' });
  });
{{/if}}
});
