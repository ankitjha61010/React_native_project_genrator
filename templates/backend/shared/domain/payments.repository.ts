import type { PageQuery } from '{{IMPORT:core.pagination}}';
import type {
  Entitlement,
  EntitlementInput,
  EntitlementSource,
{{#if GATEWAY}}
  Payment,
  PaymentInput,
  PaymentProvider,
  PaymentStatus,
{{/if}}
  PaymentStats,
  Product,
  ProductInput,
{{#if IAP}}
  Purchase,
  PurchaseInput,
  PurchaseStore,
{{/if}}
} from '{{IMPORT:domain.payments}}';

export interface Page<T> {
  items: T[];
  total: number;
}

/** Products, entitlements{{#if GATEWAY}}, gateway payments{{/if}}{{#if IAP}}, store purchases{{/if}}. */
export interface PaymentsRepository {
  // ── catalog ────────────────────────────────────────────────────────────────
  /** Sorted by sortOrder, then name. */
  listProducts(filter: { activeOnly: boolean }): Promise<Product[]>;
  findProduct(id: string): Promise<Product | null>;
{{#if IAP}}
  /** The product with this App Store or Google Play product id. */
  findProductByStoreId(storeProductId: string): Promise<Product | null>;
{{/if}}
  createProduct(data: ProductInput): Promise<Product>;
  updateProduct(id: string, data: Partial<ProductInput>): Promise<Product | null>;
  deleteProduct(id: string): Promise<boolean>;

  // ── entitlements ───────────────────────────────────────────────────────────
  listEntitlements(filter: { userId?: string }, query: PageQuery): Promise<Page<Entitlement>>;
  /** Not revoked and not expired at `now`. */
  activeEntitlements(userId: string, now: Date): Promise<Entitlement[]>;
  findEntitlement(id: string): Promise<Entitlement | null>;
  findEntitlementByReference(userId: string, source: EntitlementSource, referenceId: string): Promise<Entitlement | null>;
  createEntitlement(data: EntitlementInput): Promise<Entitlement>;
  updateEntitlement(id: string, data: Partial<Pick<Entitlement, 'expiresAt' | 'revokedAt' | 'productId'>>): Promise<Entitlement | null>;
{{#if GATEWAY}}

  // ── gateway payments ───────────────────────────────────────────────────────
  createPayment(data: PaymentInput): Promise<Payment>;
  findPayment(id: string): Promise<Payment | null>;
  findPaymentByProviderOrder(provider: PaymentProvider, providerOrderId: string): Promise<Payment | null>;
  /** Refund webhooks may only carry the charge / capture id. */
  findPaymentByProviderPayment(provider: PaymentProvider, providerPaymentId: string): Promise<Payment | null>;
  /**
   * Updates the payment only while its status is one of `from` – null when it already moved on.
   * Makes "paid" happen once, whichever of the app's confirm call and the webhook arrives first.
   */
  transitionPayment(id: string, from: PaymentStatus[], data: Partial<PaymentInput>): Promise<Payment | null>;
  listPayments(filter: { userId?: string; status?: PaymentStatus }, query: PageQuery): Promise<Page<Payment>>;
{{/if}}
{{#if IAP}}

  // ── store purchases ────────────────────────────────────────────────────────
  findPurchase(store: PurchaseStore, transactionId: string): Promise<Purchase | null>;
  /** Insert, or update the purchase with the same store + transaction id. */
  upsertPurchase(data: PurchaseInput): Promise<Purchase>;
  listPurchases(filter: { userId?: string }, query: PageQuery): Promise<Page<Purchase>>;
{{/if}}

  stats(now: Date): Promise<PaymentStats>;
}
