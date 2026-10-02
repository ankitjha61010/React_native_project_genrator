import request from 'supertest';
import { createTestApp, type TestApp } from '../support/test-app.js';
import { UserRole } from '{{IMPORT:domain.roles}}';

const api = '/api/v1';
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('payments API', () => {
  let app: TestApp;
  let user: { id: string; token: string };
  let admin: { id: string; token: string };
  let productId: string;

  beforeAll(async () => {
    app = await createTestApp();
    user = await app.signUp('Jane');
    admin = await app.signUp('Admin', UserRole.ADMIN);
  });

  afterAll(async () => {
    await app.close();
  });

  it('only admins manage products', async () => {
    const body = { name: 'Premium', price: 499, currency: 'eur', durationDays: 30{{#if IAP}}, appleProductId: 'premium.monthly', googleProductId: 'premium_monthly'{{/if}} };
    await request(app.server).post(`${api}/payments/admin/products`).set(bearer(user.token)).send(body).expect(403);
    await request(app.server).post(`${api}/payments/admin/products`).set(bearer(admin.token)).send({ ...body, currency: 'euro' }).expect(422);

    const created = await request(app.server).post(`${api}/payments/admin/products`).set(bearer(admin.token)).send(body).expect(201);
    expect(created.body.data).toMatchObject({ currency: 'EUR', accessLevel: 'premium', kind: 'one_time', displayPrice: '4.99 EUR' });
    productId = created.body.data.id;

    await request(app.server).patch(`${api}/payments/admin/products/${productId}`).set(bearer(admin.token)).send({ sortOrder: 2 }).expect(200);
    const list = await request(app.server).get(`${api}/payments/products`).set(bearer(user.token)).expect(200);
    expect(list.body.data).toEqual([expect.objectContaining({ id: productId, sortOrder: 2 })]);
  });
{{#if GATEWAY}}

  it('checkout → confirm → access; the admin sees and refunds it', async () => {
    const checkout = await request(app.server).post(`${api}/payments/checkout`).set(bearer(user.token)).send({ productId }).expect(201);
    expect(checkout.body.data).toMatchObject({ provider: '{{GATEWAY_ID}}', amount: 499, currency: 'EUR', client: { orderId: 'order_1' } });

    const confirmed = await request(app.server).post(`${api}/payments/${checkout.body.data.paymentId}/confirm`).set(bearer(user.token)).send({}).expect(200);
    expect(confirmed.body.data.status).toBe('paid');
    const me = await request(app.server).get(`${api}/payments/me`).set(bearer(user.token)).expect(200);
    expect(me.body.data.accessLevels).toEqual(['premium']);

    const history = await request(app.server).get(`${api}/payments/history`).set(bearer(user.token)).expect(200);
    expect(history.body.meta.total).toBe(1);
    const all = await request(app.server).get(`${api}/payments/admin/payments?status=paid`).set(bearer(admin.token)).expect(200);
    expect(all.body.data).toEqual([expect.objectContaining({ userId: user.id, displayAmount: '4.99 EUR' })]);

    await request(app.server).post(`${api}/payments/admin/payments/${checkout.body.data.paymentId}/refund`).set(bearer(user.token)).send({}).expect(403);
    const refunded = await request(app.server).post(`${api}/payments/admin/payments/${checkout.body.data.paymentId}/refund`).set(bearer(admin.token)).send({}).expect(200);
    expect(refunded.body.data.status).toBe('refunded');
    expect((await request(app.server).get(`${api}/payments/me`).set(bearer(user.token)).expect(200)).body.data.accessLevels).toEqual([]);
  });

  it('webhooks are public but must be signed (raw body)', async () => {
    const checkout = await request(app.server).post(`${api}/payments/checkout`).set(bearer(user.token)).send({ productId }).expect(201);
    const providerOrderId = checkout.body.data.client.orderId as string;
    const event = JSON.stringify({ type: 'paid', providerOrderId, providerPaymentId: 'charge_x' });

    await request(app.server).post(`${api}/payments/webhooks/{{GATEWAY_ID}}`).set('Content-Type', 'application/json').send(event).expect(400);
    await request(app.server).post(`${api}/payments/webhooks/{{GATEWAY_ID}}`).set('Content-Type', 'application/json').set('x-fake-signature', 'valid').send(event).expect(200);

    const me = await request(app.server).get(`${api}/payments/me`).set(bearer(user.token)).expect(200);
    expect(me.body.data.accessLevels).toEqual(['premium']);
  });
{{/if}}
{{#if IAP_NATIVE}}

  it('verifies a store purchase', async () => {
    app.storeVerifier.purchases.set('purchase-token', {
      store: 'play_store',
      storeProductId: 'premium_monthly',
      transactionId: 'GPA.1234',
      originalTransactionId: 'purchase-token',
      status: 'active',
      environment: 'Sandbox',
      purchasedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await request(app.server).post(`${api}/payments/iap/verify`).set(bearer(user.token)).send({ platform: 'android', productId: 'premium_monthly' }).expect(422);
    const res = await request(app.server)
      .post(`${api}/payments/iap/verify`)
      .set(bearer(user.token))
      .send({ platform: 'android', productId: 'premium_monthly', purchaseToken: 'purchase-token', type: 'subs' })
      .expect(200);
    expect(res.body.data.access.accessLevels).toEqual(['premium']);

    const purchases = await request(app.server).get(`${api}/payments/admin/purchases`).set(bearer(admin.token)).expect(200);
    expect(purchases.body.data).toEqual([expect.objectContaining({ transactionId: 'GPA.1234', store: 'play_store' })]);
  });
{{/if}}
{{#if IAP_ADAPTY}}

  it('Adapty webhook + sync', async () => {
    app.adapty.levels.set(user.id, [
      { accessLevel: 'adapty_pro', isActive: true, expiresAt: null, store: null, vendorProductId: null, transactionId: null, originalTransactionId: null, purchasedAt: null, isRefund: false },
    ]);
    await request(app.server).post(`${api}/payments/webhooks/adapty`).send({ customer_user_id: user.id }).expect(401);
    await request(app.server).post(`${api}/payments/webhooks/adapty`).set('Authorization', 'adapty-token').send({ customer_user_id: user.id, event_type: 'subscription_started' }).expect(200);
    expect((await request(app.server).get(`${api}/payments/me`).set(bearer(user.token)).expect(200)).body.data.accessLevels).toContain('adapty_pro');

    app.adapty.levels.set(user.id, []);
    const synced = await request(app.server).post(`${api}/payments/adapty/sync`).set(bearer(user.token)).expect(200);
    expect(synced.body.data.accessLevels).not.toContain('adapty_pro');
  });
{{/if}}

  it('admins grant / revoke access and see the stats', async () => {
    const granted = await request(app.server).post(`${api}/payments/admin/entitlements`).set(bearer(admin.token)).send({ userId: user.id, accessLevel: 'vip' }).expect(201);
    const list = await request(app.server).get(`${api}/payments/admin/entitlements?userId=${user.id}`).set(bearer(admin.token)).expect(200);
    expect(list.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ accessLevel: 'vip', source: 'admin', active: true })]));
    await request(app.server).delete(`${api}/payments/admin/entitlements/${granted.body.data.id}`).set(bearer(admin.token)).expect(200);

    const stats = await request(app.server).get(`${api}/payments/admin/stats`).set(bearer(admin.token)).expect(200);
    expect(stats.body.data).toMatchObject({ products: 1 });
    await request(app.server).get(`${api}/payments/admin/stats`).set(bearer(user.token)).expect(403);
  });
});
