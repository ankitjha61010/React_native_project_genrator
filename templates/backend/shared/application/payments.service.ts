import { {{#if GATEWAY}}BadRequestError, {{/if}}{{#if IAP_NATIVE}}ConflictError, {{/if}}NotFoundError{{#if IAP_ADAPTY}}, UnauthorizedError{{/if}} } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import { Paginated, type PageQuery } from '{{IMPORT:core.pagination}}';
import {
{{#if IAP_ADAPTY}}
  isEntitlementActive,
{{/if}}
  toEntitlementView,
  toProductView,
  type Entitlement,
  type EntitlementSource,
  type EntitlementView,
  type PaymentStats,
  type Product,
  type ProductInput,
  type ProductView,
{{#if GATEWAY}}
  toPaymentView,
  type Payment,
  type PaymentStatus,
  type PaymentView,
{{/if}}
{{#if IAP}}
  toPurchaseView,
  type PurchaseView,
{{/if}}
} from '{{IMPORT:domain.payments}}';
import type { PaymentsRepository } from '{{IMPORT:contract.payments}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
{{#if GATEWAY}}
import type { GatewayConfirmation, PaymentGateway } from '{{IMPORT:port.paymentGateway}}';
{{/if}}
{{#if IAP_NATIVE}}
import type { StorePurchaseInput, StorePurchaseVerifier } from '{{IMPORT:port.inAppPurchases}}';
{{/if}}
{{#if IAP_ADAPTY}}
import type { AdaptyClient } from '{{IMPORT:port.inAppPurchases}}';
{{/if}}
import { PAYMENTS_MESSAGES } from '{{IMPORT:messages.payments}}';

export interface PaymentsDependencies {
  payments: PaymentsRepository;
  users: UsersRepository;
{{#if GATEWAY}}
  gateway: PaymentGateway;
{{/if}}
{{#if IAP_NATIVE}}
  storeVerifier: StorePurchaseVerifier;
{{/if}}
{{#if IAP_ADAPTY}}
  adapty: AdaptyClient;
{{/if}}
  logger: Logger;
  /** The clock (tests move it). */
  now?: () => Date;
}

/** What a user has access to right now. */
export interface AccessView {
  /** e.g. ["premium"] – check these in the app to unlock features. */
  accessLevels: string[];
  entitlements: EntitlementView[];
}
{{#if GATEWAY}}

/** What the app needs to open the provider's checkout. */
export interface CheckoutView {
  paymentId: string;
  provider: Payment['provider'];
  amount: number;
  currency: string;
  product: ProductView;
  /** Provider specific: client secret / key id + order id / approval URL. */
  client: Record<string, string | number | null>;
}
{{/if}}

{{#if PAYMENT_VERIFIERS}}
const DAY = 24 * 60 * 60 * 1000;
{{/if}}

/**
 * Payments: the catalog, who has access to what (entitlements){{#if GATEWAY}}, {{GATEWAY_NAME}} checkout{{/if}}{{#if IAP}}, {{IAP_PROVIDER_NAME}} purchases{{/if}}.
 * Access is only granted from what the provider / store confirms – never from the app's word.
 */
export class PaymentsService {
  constructor(private readonly deps: PaymentsDependencies) {}

  private now(): Date {
    return this.deps.now?.() ?? new Date();
  }

  // ── catalog ────────────────────────────────────────────────────────────────

  async listProducts(activeOnly = true): Promise<ProductView[]> {
    return (await this.deps.payments.listProducts({ activeOnly })).map(toProductView);
  }

  private async requireProduct(id: string): Promise<Product> {
    const product = await this.deps.payments.findProduct(id);
    if (!product) throw new NotFoundError(PAYMENTS_MESSAGES.productNotFound);
    return product;
  }

  async createProduct(input: ProductInput): Promise<ProductView> {
    return toProductView(await this.deps.payments.createProduct({ ...input, currency: input.currency.toUpperCase() }));
  }

  async updateProduct(id: string, input: Partial<ProductInput>): Promise<ProductView> {
    // Only what was sent changes (a DTO may carry the other fields as undefined).
    const changes = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<ProductInput>;
    if (changes.currency) changes.currency = changes.currency.toUpperCase();
    const updated = await this.deps.payments.updateProduct(id, changes);
    if (!updated) throw new NotFoundError(PAYMENTS_MESSAGES.productNotFound);
    return toProductView(updated);
  }

  /** Past payments / purchases keep the product id; to stop selling something, deactivate it instead. */
  async deleteProduct(id: string): Promise<void> {
    if (!(await this.deps.payments.deleteProduct(id))) throw new NotFoundError(PAYMENTS_MESSAGES.productNotFound);
  }

  // ── access ─────────────────────────────────────────────────────────────────

  async access(userId: string): Promise<AccessView> {
    const now = this.now();
    const entitlements = await this.deps.payments.activeEntitlements(userId, now);
    return { accessLevels: [...new Set(entitlements.map(e => e.accessLevel))].toSorted(), entitlements: entitlements.map(e => toEntitlementView(e, now)) };
  }

  async listEntitlements(filter: { userId?: string }, query: PageQuery): Promise<Paginated<EntitlementView>> {
    const { items, total } = await this.deps.payments.listEntitlements(filter, query);
    const now = this.now();
    return Paginated.of(items.map(e => toEntitlementView(e, now)), total, query);
  }

  /** Admin: give someone access by hand (support, testers, compensation). */
  async grantEntitlement(input: { userId: string; accessLevel: string; expiresAt?: Date | null; productId?: string | null }): Promise<EntitlementView> {
    if (!(await this.deps.users.findById(input.userId))) throw new NotFoundError(PAYMENTS_MESSAGES.userNotFound);
    if (input.productId) await this.requireProduct(input.productId);
    const entitlement = await this.deps.payments.createEntitlement({
      userId: input.userId,
      accessLevel: input.accessLevel,
      source: 'admin',
      productId: input.productId ?? null,
      referenceId: null,
      expiresAt: input.expiresAt ?? null,
    });
    return toEntitlementView(entitlement, this.now());
  }

  async revokeEntitlement(id: string): Promise<EntitlementView> {
    const revoked = await this.deps.payments.updateEntitlement(id, { revokedAt: this.now() });
    if (!revoked) throw new NotFoundError(PAYMENTS_MESSAGES.entitlementNotFound);
    return toEntitlementView(revoked, this.now());
  }

  stats(): Promise<PaymentStats> {
    return this.deps.payments.stats(this.now());
  }

  /** Grants (or renews / re-activates) the entitlement a payment or purchase stands for. */
  private async grant(input: { userId: string; accessLevel: string; source: EntitlementSource; productId: string | null; referenceId: string; expiresAt: Date | null }): Promise<Entitlement> {
    const existing = await this.deps.payments.findEntitlementByReference(input.userId, input.source, input.referenceId);
    if (existing) {
      return (await this.deps.payments.updateEntitlement(existing.id, { expiresAt: input.expiresAt, revokedAt: null, productId: input.productId })) ?? existing;
    }
    return this.deps.payments.createEntitlement({ ...input });
  }

  private async revokeReference(userId: string, source: EntitlementSource, referenceId: string): Promise<void> {
    const existing = await this.deps.payments.findEntitlementByReference(userId, source, referenceId);
    if (existing && !existing.revokedAt) await this.deps.payments.updateEntitlement(existing.id, { revokedAt: this.now() });
  }
{{#if GATEWAY}}

  // ── gateway checkout ({{GATEWAY_NAME}}) ───────────────────────────────────

  async checkout(userId: string, productId: string): Promise<CheckoutView> {
    const product = await this.requireProduct(productId);
    if (!product.active) throw new BadRequestError(PAYMENTS_MESSAGES.productUnavailable);
    if (product.price <= 0) throw new BadRequestError(PAYMENTS_MESSAGES.freeProduct);
    const user = await this.deps.users.findById(userId);
    if (!user) throw new NotFoundError(PAYMENTS_MESSAGES.userNotFound);

    const order = await this.deps.gateway.createOrder({
      amount: product.price,
      currency: product.currency,
      description: product.name,
      userId,
      productId: product.id,
      customerEmail: user.email,
    });
    const payment = await this.deps.payments.createPayment({
      userId,
      productId: product.id,
      provider: this.deps.gateway.name,
      providerOrderId: order.providerOrderId,
      providerPaymentId: null,
      amount: product.price,
      currency: product.currency,
      status: 'pending',
      refundedAmount: 0,
      failureReason: null,
      paidAt: null,
    });
    this.deps.logger.info({ paymentId: payment.id, productId, provider: payment.provider }, 'Checkout created');
    return { paymentId: payment.id, provider: payment.provider, amount: payment.amount, currency: payment.currency, product: toProductView(product), client: order.client };
  }

  /** The app finished the provider's checkout – ask the provider whether it is really paid. */
  async confirm(userId: string, paymentId: string, input: Record<string, string>): Promise<PaymentView> {
    const payment = await this.deps.payments.findPayment(paymentId);
    if (!payment || payment.userId !== userId) throw new NotFoundError(PAYMENTS_MESSAGES.paymentNotFound);
    if (payment.status !== 'pending' && payment.status !== 'failed') return toPaymentView(payment);
    return toPaymentView(await this.apply(payment, await this.deps.gateway.confirm(payment.providerOrderId, input)));
  }

  private async apply(payment: Payment, result: GatewayConfirmation): Promise<Payment> {
    if (result.status === 'paid') return this.markPaid(payment, result.providerPaymentId);
    if (result.status === 'failed') {
      return (await this.deps.payments.transitionPayment(payment.id, ['pending'], { status: 'failed', failureReason: result.failureReason ?? null })) ?? payment;
    }
    return payment;
  }

  /** pending / failed → paid exactly once, then the entitlement. */
  private async markPaid(payment: Payment, providerPaymentId: string | null): Promise<Payment> {
    const now = this.now();
    const paid = await this.deps.payments.transitionPayment(payment.id, ['pending', 'failed'], { status: 'paid', providerPaymentId, paidAt: now, failureReason: null });
    if (!paid) return (await this.deps.payments.findPayment(payment.id)) ?? payment;

    const product = await this.deps.payments.findProduct(paid.productId);
    if (product) {
      await this.grant({
        userId: paid.userId,
        accessLevel: product.accessLevel,
        source: 'gateway',
        productId: product.id,
        referenceId: paid.id,
        expiresAt: product.durationDays ? await this.passExpiry(paid.userId, product, now) : null,
      });
    }
    this.deps.logger.info({ paymentId: paid.id, amount: paid.amount, currency: paid.currency }, 'Payment paid');
    return paid;
  }

  /** Buying a pass while one is still running adds the days at its end. */
  private async passExpiry(userId: string, product: Product, now: Date): Promise<Date> {
    const running = (await this.deps.payments.activeEntitlements(userId, now)).filter(e => e.accessLevel === product.accessLevel && e.source === 'gateway' && e.expiresAt);
    const start = Math.max(now.getTime(), ...running.map(e => e.expiresAt!.getTime()));
    return new Date(start + (product.durationDays ?? 0) * DAY);
  }

  /** Webhook from {{GATEWAY_NAME}} – the source of truth (signature checked by the gateway). */
  async handleWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): Promise<void> {
    const event = await this.deps.gateway.parseWebhook(rawBody, headers);
    const provider = this.deps.gateway.name;
    if (event.type === 'ignored') return;
    if (event.type === 'refunded') {
      const payment =
        (event.providerOrderId ? await this.deps.payments.findPaymentByProviderOrder(provider, event.providerOrderId) : null) ??
        (event.providerPaymentId ? await this.deps.payments.findPaymentByProviderPayment(provider, event.providerPaymentId) : null);
      if (payment) await this.applyRefund(payment, event.refundedAmount);
      return;
    }
    const payment = await this.deps.payments.findPaymentByProviderOrder(provider, event.providerOrderId);
    if (!payment) {
      this.deps.logger.warn({ provider, providerOrderId: event.providerOrderId }, 'Webhook for an unknown payment');
      return;
    }
    await this.apply(payment, event.type === 'paid' ? { status: 'paid', providerPaymentId: event.providerPaymentId } : { status: 'failed', providerPaymentId: null, failureReason: event.failureReason });
  }

  /** Admin: refund all of a payment, or `amount` of it. A full refund removes the access it gave. */
  async refund(paymentId: string, amount?: number): Promise<PaymentView> {
    const payment = await this.deps.payments.findPayment(paymentId);
    if (!payment) throw new NotFoundError(PAYMENTS_MESSAGES.paymentNotFound);
    if ((payment.status !== 'paid' && payment.status !== 'partially_refunded') || !payment.providerPaymentId) {
      throw new BadRequestError(PAYMENTS_MESSAGES.notRefundable);
    }
    const remaining = payment.amount - payment.refundedAmount;
    const value = amount ?? remaining;
    if (value <= 0 || value > remaining) throw new BadRequestError(PAYMENTS_MESSAGES.refundTooLarge);

    await this.deps.gateway.refund({ providerOrderId: payment.providerOrderId, providerPaymentId: payment.providerPaymentId, amount: value, currency: payment.currency });
    this.deps.logger.info({ paymentId, amount: value }, 'Payment refunded');
    return toPaymentView(await this.applyRefund(payment, payment.refundedAmount + value));
  }

  /** `totalRefunded`: everything refunded so far (our own refund and the provider's webhook report the same total). */
  private async applyRefund(payment: Payment, totalRefunded: number): Promise<Payment> {
    const refundedAmount = Math.min(payment.amount, Math.max(payment.refundedAmount, totalRefunded));
    const status: PaymentStatus = refundedAmount >= payment.amount ? 'refunded' : 'partially_refunded';
    const updated = (await this.deps.payments.transitionPayment(payment.id, ['paid', 'partially_refunded'], { status, refundedAmount })) ?? payment;
    if (status === 'refunded') await this.revokeReference(payment.userId, 'gateway', payment.id);
    return updated;
  }

  async listPayments(filter: { userId?: string; status?: PaymentStatus }, query: PageQuery): Promise<Paginated<PaymentView>> {
    const { items, total } = await this.deps.payments.listPayments(filter, query);
    return Paginated.of(items.map(toPaymentView), total, query);
  }
{{/if}}
{{#if IAP}}

  async listPurchases(filter: { userId?: string }, query: PageQuery): Promise<Paginated<PurchaseView>> {
    const { items, total } = await this.deps.payments.listPurchases(filter, query);
    return Paginated.of(items.map(toPurchaseView), total, query);
  }
{{/if}}
{{#if IAP_NATIVE}}

  // ── in-app purchases (react-native-iap) ───────────────────────────────────

  /**
   * The app bought something in the store: verify it with Apple / Google, record it and grant the
   * product's access level. The app calls finishTransaction() only after this succeeded.
   */
  async verifyStorePurchase(userId: string, input: StorePurchaseInput): Promise<{ purchase: PurchaseView; access: AccessView }> {
    const verified = await this.deps.storeVerifier.verify(input);
    const product = await this.deps.payments.findProductByStoreId(verified.storeProductId);
    if (!product) throw new NotFoundError(PAYMENTS_MESSAGES.unknownStoreProduct);

    // One store transaction, one account – a receipt can't unlock a second account.
    const existing = await this.deps.payments.findPurchase(verified.store, verified.transactionId);
    if (existing && existing.userId !== userId) throw new ConflictError(PAYMENTS_MESSAGES.purchaseOwnedByOther);

    const purchase = await this.deps.payments.upsertPurchase({ ...verified, userId, productId: product.id });
    // Renewals share the original transaction id → the same entitlement is extended.
    const referenceId = verified.originalTransactionId ?? verified.transactionId;
    if (verified.status === 'active') {
      const expiresAt = verified.expiresAt ?? (product.durationDays ? new Date(verified.purchasedAt.getTime() + product.durationDays * DAY) : null);
      await this.grant({ userId, accessLevel: product.accessLevel, source: verified.store, productId: product.id, referenceId, expiresAt });
    } else if (verified.status !== 'pending') {
      await this.revokeReference(userId, verified.store, referenceId);
    }
    this.deps.logger.info({ userId, store: verified.store, productId: verified.storeProductId, status: verified.status }, 'Store purchase verified');
    return { purchase: toPurchaseView(purchase), access: await this.access(userId) };
  }
{{/if}}
{{#if IAP_ADAPTY}}

  // ── in-app purchases (Adapty) ─────────────────────────────────────────────

  /** Mirrors the user's Adapty access levels into entitlements (after a purchase / restore, and on webhooks). */
  async syncAdapty(userId: string): Promise<AccessView> {
    const levels = await this.deps.adapty.accessLevels(userId);
    const seen = new Set<string>();
    for (const level of levels) {
      const referenceId = `adapty:${level.accessLevel}`;
      seen.add(referenceId);
      if (level.isActive) {
        await this.grant({ userId, accessLevel: level.accessLevel, source: 'adapty', productId: null, referenceId, expiresAt: level.expiresAt });
      } else {
        await this.revokeReference(userId, 'adapty', referenceId);
      }
      if (level.transactionId && (level.store === 'app_store' || level.store === 'play_store')) {
        const product = level.vendorProductId ? await this.deps.payments.findProductByStoreId(level.vendorProductId) : null;
        await this.deps.payments.upsertPurchase({
          userId,
          productId: product?.id ?? null,
          store: level.store,
          storeProductId: level.vendorProductId ?? level.accessLevel,
          transactionId: level.transactionId,
          originalTransactionId: level.originalTransactionId,
          status: level.isRefund ? 'refunded' : level.isActive ? 'active' : 'expired',
          environment: null,
          purchasedAt: level.purchasedAt ?? this.now(),
          expiresAt: level.expiresAt,
        });
      }
    }
    // Access levels Adapty no longer reports are gone.
    const { items } = await this.deps.payments.listEntitlements({ userId }, { page: 1, limit: 100 });
    for (const e of items) {
      if (e.source === 'adapty' && e.referenceId && !seen.has(e.referenceId) && isEntitlementActive(e, this.now())) {
        await this.deps.payments.updateEntitlement(e.id, { revokedAt: this.now() });
      }
    }
    return this.access(userId);
  }

  /** Adapty webhook: any event about a customer re-syncs that customer's access levels. */
  async handleAdaptyWebhook(authorization: string | undefined, body: { customer_user_id?: string | null; event_type?: string }): Promise<void> {
    if (!this.deps.adapty.isValidWebhook(authorization)) throw new UnauthorizedError(PAYMENTS_MESSAGES.invalidWebhook);
    // Adapty's "test webhook" button sends no customer.
    const userId = body.customer_user_id;
    if (!userId || !(await this.deps.users.findById(userId))) return;
    await this.syncAdapty(userId);
    this.deps.logger.info({ userId, event: body.event_type }, 'Adapty webhook processed');
  }
{{/if}}
}
