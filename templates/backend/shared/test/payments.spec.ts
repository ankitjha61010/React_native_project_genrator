import { createHarness, type Harness } from '../support/test-infrastructure.js';

const DAY = 24 * 60 * 60 * 1000;

describe('payments', () => {
  let h: Harness;
  let userId: string;

  const product = (overrides: Record<string, unknown> = {}) =>
    h.payments.createProduct({
      name: 'Premium – 30 days',
      description: null,
      kind: 'one_time',
      price: 999,
      currency: 'usd',
      accessLevel: 'premium',
      durationDays: 30,
      appleProductId: null,
      googleProductId: null,
      active: true,
      sortOrder: 0,
      ...overrides,
    });

  beforeEach(async () => {
    h = createHarness();
    userId = (await h.repositories.users.create({ email: 'jane@example.com', name: 'Jane' })).id;
  });

  it('manages the catalog; the app only sees active products', async () => {
    const shown = await product();
    const hidden = await product({ name: 'Old plan', active: false });
    expect(shown).toMatchObject({ currency: 'USD', displayPrice: '9.99 USD' });

    expect((await h.payments.listProducts()).map(p => p.id)).toEqual([shown.id]);
    expect(await h.payments.listProducts(false)).toHaveLength(2);
    expect((await h.payments.updateProduct(hidden.id, { active: true })).active).toBe(true);
    await h.payments.deleteProduct(hidden.id);
    await expect(h.payments.deleteProduct(hidden.id)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('admins grant and revoke access by hand', async () => {
    const granted = await h.payments.grantEntitlement({ userId, accessLevel: 'premium' });
    expect((await h.payments.access(userId)).accessLevels).toEqual(['premium']);
    await h.payments.revokeEntitlement(granted.id);
    expect((await h.payments.access(userId)).accessLevels).toEqual([]);
    await expect(h.payments.grantEntitlement({ userId: 'nobody', accessLevel: 'premium' })).rejects.toMatchObject({ statusCode: 404 });
  });
{{#if GATEWAY}}

  it('checkout → confirm grants the access once, for the product duration', async () => {
    const p = await product();
    const checkout = await h.payments.checkout(userId, p.id);
    expect(checkout).toMatchObject({ provider: '{{GATEWAY_ID}}', amount: 999, currency: 'USD' });
    expect(h.paymentGateway.orders[0]).toMatchObject({ amount: 999, customerEmail: 'jane@example.com' });

    const paid = await h.payments.confirm(userId, checkout.paymentId, {});
    expect(paid).toMatchObject({ status: 'paid', providerPaymentId: 'pay_order_1' });
    // Confirming again (or a late webhook) changes nothing.
    await h.payments.confirm(userId, checkout.paymentId, {});
    const access = await h.payments.access(userId);
    expect(access.entitlements).toHaveLength(1);
    const expiresIn = new Date(access.entitlements[0]?.expiresAt ?? 0).getTime() - Date.now();
    expect(expiresIn).toBeGreaterThan(29 * DAY);
    expect(expiresIn).toBeLessThanOrEqual(30 * DAY);
  });

  it('a second pass adds its days after the first one', async () => {
    const p = await product();
    for (let i = 0; i < 2; i++) {
      const checkout = await h.payments.checkout(userId, p.id);
      await h.payments.confirm(userId, checkout.paymentId, {});
    }
    const latest = Math.max(...(await h.payments.access(userId)).entitlements.map(e => new Date(e.expiresAt!).getTime()));
    expect(latest - Date.now()).toBeGreaterThan(59 * DAY);
  });

  it("only the buyer can confirm; pending and failed payments grant nothing", async () => {
    const p = await product();
    const checkout = await h.payments.checkout(userId, p.id);
    const other = (await h.repositories.users.create({ email: 'x@example.com', name: 'X' })).id;
    await expect(h.payments.confirm(other, checkout.paymentId, {})).rejects.toMatchObject({ statusCode: 404 });

    h.paymentGateway.nextStatus = 'pending';
    expect((await h.payments.confirm(userId, checkout.paymentId, {})).status).toBe('pending');
    h.paymentGateway.nextStatus = 'failed';
    expect((await h.payments.confirm(userId, checkout.paymentId, {})).status).toBe('failed');
    expect((await h.payments.access(userId)).accessLevels).toEqual([]);
  });

  it('webhooks must be signed and mark the payment paid', async () => {
    const p = await product({ durationDays: null });
    const checkout = await h.payments.checkout(userId, p.id);
    const body = Buffer.from(JSON.stringify({ type: 'paid', providerOrderId: 'order_1', providerPaymentId: 'charge_1' }));

    await expect(h.payments.handleWebhook(body, {})).rejects.toMatchObject({ code: 'INVALID_WEBHOOK_SIGNATURE' });
    await h.payments.handleWebhook(body, { 'x-fake-signature': 'valid' });
    await h.payments.handleWebhook(body, { 'x-fake-signature': 'valid' });

    const access = await h.payments.access(userId);
    expect(access.entitlements).toEqual([expect.objectContaining({ accessLevel: 'premium', expiresAt: null, source: 'gateway', referenceId: checkout.paymentId })]);
  });

  it('refunds: partial keeps the access, full removes it', async () => {
    const p = await product();
    const { paymentId } = await h.payments.checkout(userId, p.id);
    await expect(h.payments.refund(paymentId)).rejects.toMatchObject({ code: 'NOT_REFUNDABLE' });
    await h.payments.confirm(userId, paymentId, {});

    expect(await h.payments.refund(paymentId, 300)).toMatchObject({ status: 'partially_refunded', refundedAmount: 300 });
    expect((await h.payments.access(userId)).accessLevels).toEqual(['premium']);
    await expect(h.payments.refund(paymentId, 700)).rejects.toMatchObject({ code: 'REFUND_TOO_LARGE' });

    expect(await h.payments.refund(paymentId)).toMatchObject({ status: 'refunded', refundedAmount: 999 });
    expect(h.paymentGateway.refunds.map(r => r.amount)).toEqual([300, 699]);
    expect((await h.payments.access(userId)).accessLevels).toEqual([]);

    const stats = await h.payments.stats();
    expect(stats).toMatchObject({ paidPayments: 1, revenue: [{ currency: 'USD', amount: 0 }] });
  });

  it('free and inactive products cannot be bought', async () => {
    await expect(h.payments.checkout(userId, (await product({ price: 0 })).id)).rejects.toMatchObject({ code: 'PRODUCT_NOT_PURCHASABLE' });
    await expect(h.payments.checkout(userId, (await product({ active: false })).id)).rejects.toMatchObject({ code: 'PRODUCT_UNAVAILABLE' });
  });
{{/if}}
{{#if IAP_NATIVE}}

  it('verifies store purchases and grants the product access', async () => {
    await product({ kind: 'subscription', appleProductId: 'premium.monthly', durationDays: null });
    const expiresAt = new Date(Date.now() + 30 * DAY);
    h.storeVerifier.purchases.set('tx-1', {
      store: 'app_store',
      storeProductId: 'premium.monthly',
      transactionId: 'tx-1',
      originalTransactionId: 'otx-1',
      status: 'active',
      environment: 'Sandbox',
      purchasedAt: new Date(),
      expiresAt,
    });

    const { access, purchase } = await h.payments.verifyStorePurchase(userId, { platform: 'ios', productId: 'premium.monthly', transactionId: 'tx-1' });
    expect(purchase).toMatchObject({ store: 'app_store', status: 'active' });
    expect(access.entitlements).toEqual([expect.objectContaining({ accessLevel: 'premium', source: 'app_store', expiresAt: expiresAt.toISOString() })]);

    // The same receipt can't unlock another account.
    const other = (await h.repositories.users.create({ email: 'x@example.com', name: 'X' })).id;
    await expect(h.payments.verifyStorePurchase(other, { platform: 'ios', productId: 'premium.monthly', transactionId: 'tx-1' })).rejects.toMatchObject({ statusCode: 409 });

    // Refunded later: the access goes away.
    h.storeVerifier.purchases.set('tx-1', { ...h.storeVerifier.purchases.get('tx-1')!, status: 'refunded' });
    await h.payments.verifyStorePurchase(userId, { platform: 'ios', productId: 'premium.monthly', transactionId: 'tx-1' });
    expect((await h.payments.access(userId)).accessLevels).toEqual([]);
  });

  it('rejects purchases of products that are not in the catalog or unknown to the store', async () => {
    await expect(h.payments.verifyStorePurchase(userId, { platform: 'android', productId: 'x', purchaseToken: 'nope' })).rejects.toMatchObject({ statusCode: 404 });
    h.storeVerifier.purchases.set('token-1', {
      store: 'play_store',
      storeProductId: 'not.in.catalog',
      transactionId: 'GPA.1',
      originalTransactionId: 'token-1',
      status: 'active',
      environment: 'Production',
      purchasedAt: new Date(),
      expiresAt: null,
    });
    await expect(h.payments.verifyStorePurchase(userId, { platform: 'android', productId: 'not.in.catalog', purchaseToken: 'token-1' })).rejects.toMatchObject({
      code: 'UNKNOWN_STORE_PRODUCT',
    });
  });
{{/if}}
{{#if IAP_ADAPTY}}

  it('mirrors Adapty access levels (grant, renew, expire)', async () => {
    const level = { accessLevel: 'premium', isActive: true, expiresAt: new Date(Date.now() + DAY), store: 'app_store', vendorProductId: 'premium.monthly', transactionId: 'tx-1', originalTransactionId: 'otx-1', purchasedAt: new Date(), isRefund: false };
    h.adapty.levels.set(userId, [level]);
    expect((await h.payments.syncAdapty(userId)).accessLevels).toEqual(['premium']);
    expect(await h.payments.listPurchases({ userId }, { page: 1, limit: 10 })).toMatchObject({ meta: { total: 1 } });

    // Renewal: still one entitlement, later expiry.
    h.adapty.levels.set(userId, [{ ...level, expiresAt: new Date(Date.now() + 31 * DAY) }]);
    expect((await h.payments.syncAdapty(userId)).entitlements).toHaveLength(1);

    h.adapty.levels.set(userId, []);
    expect((await h.payments.syncAdapty(userId)).accessLevels).toEqual([]);
  });

  it('accepts Adapty webhooks only with the token', async () => {
    h.adapty.levels.set(userId, [{ accessLevel: 'premium', isActive: true, expiresAt: null, store: null, vendorProductId: null, transactionId: null, originalTransactionId: null, purchasedAt: null, isRefund: false }]);
    await expect(h.payments.handleAdaptyWebhook('wrong', { customer_user_id: userId })).rejects.toMatchObject({ statusCode: 401 });
    // Adapty's "test webhook" has no customer.
    await h.payments.handleAdaptyWebhook('adapty-token', {});
    await h.payments.handleAdaptyWebhook('adapty-token', { customer_user_id: userId, event_type: 'subscription_started' });
    expect((await h.payments.access(userId)).accessLevels).toEqual(['premium']);
  });
{{/if}}
});
