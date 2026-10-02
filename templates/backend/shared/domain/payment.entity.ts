/**
 * Payments domain{{#if IAP}} – in-app purchases ({{IAP_PROVIDER_NAME}}){{/if}}{{#if GATEWAY}} – {{GATEWAY_NAME}} checkout{{/if}}.
 *
 * - Product:     what can be bought (managed in the admin panel). Prices are integers in the
 *                currency's minor unit (cents, paise…).
 * - Entitlement: what a user has access to (an `accessLevel` such as "premium"), until `expiresAt`.
{{#if GATEWAY}}
 * - Payment:     one gateway checkout ({{GATEWAY_NAME}}) – pending → paid / failed → refunded.
{{/if}}
{{#if IAP}}
 * - Purchase:    one store transaction (App Store / Google Play){{#if IAP_ADAPTY}}, reported by Adapty{{/if}}.
{{/if}}
 */

export const PRODUCT_KINDS = ['one_time', 'subscription'] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

/** Where an entitlement came from. */
export const ENTITLEMENT_SOURCES = ['gateway', 'app_store', 'play_store', 'adapty', 'admin'] as const;
export type EntitlementSource = (typeof ENTITLEMENT_SOURCES)[number];

export interface Product {
  id: string;
  name: string;
  description: string | null;
  kind: ProductKind;
  /** Minor units (e.g. 999 = 9.99 USD). */
  price: number;
  /** ISO 4217, upper case. */
  currency: string;
  /** What buying it unlocks, e.g. "premium". */
  accessLevel: string;
  /** Access lasts this many days ({{#if GATEWAY}}gateway passes{{else}}not used by store subscriptions{{/if}}); null = forever. */
  durationDays: number | null;
  /** App Store Connect product id (in-app purchases). */
  appleProductId: string | null;
  /** Google Play product id (in-app purchases). */
  googleProductId: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export interface Entitlement {
  id: string;
  userId: string;
  accessLevel: string;
  source: EntitlementSource;
  productId: string | null;
  /** The payment / purchase that granted it (refunds revoke it), or the Adapty access level. */
  referenceId: string | null;
  /** null = never expires. */
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type EntitlementInput = Omit<Entitlement, 'id' | 'createdAt' | 'updatedAt' | 'revokedAt'>;

export const isEntitlementActive = (e: Pick<Entitlement, 'expiresAt' | 'revokedAt'>, now = new Date()): boolean =>
  !e.revokedAt && (!e.expiresAt || e.expiresAt.getTime() > now.getTime());
{{#if GATEWAY}}

export const PAYMENT_PROVIDERS = ['stripe', 'razorpay', 'paypal'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface Payment {
  id: string;
  userId: string;
  productId: string;
  provider: PaymentProvider;
  /** Stripe PaymentIntent id / Razorpay order id / PayPal order id. */
  providerOrderId: string;
  /** Stripe charge / Razorpay payment / PayPal capture – known once paid. */
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  refundedAmount: number;
  failureReason: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentInput = Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>;
{{/if}}
{{#if IAP}}

export const PURCHASE_STORES = ['app_store', 'play_store'] as const;
export type PurchaseStore = (typeof PURCHASE_STORES)[number];

export const PURCHASE_STATUSES = ['active', 'expired', 'refunded', 'pending'] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export interface Purchase {
  id: string;
  userId: string;
  productId: string | null;
  store: PurchaseStore;
  storeProductId: string;
  /** Apple transaction id / Google order id (unique per store). */
  transactionId: string;
  /** Apple original transaction id / Google purchase token – the same for every renewal. */
  originalTransactionId: string | null;
  status: PurchaseStatus;
  /** Production / Sandbox. */
  environment: string | null;
  purchasedAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PurchaseInput = Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>;
{{/if}}

/** Totals for the admin dashboard. */
export interface PaymentStats {
  activeEntitlements: number;
  products: number;
{{#if GATEWAY}}
  paidPayments: number;
  /** Paid minus refunded, per currency (minor units). */
  revenue: Array<{ currency: string; amount: number }>;
{{/if}}
{{#if IAP}}
  purchases: number;
{{/if}}
}

// ── money ─────────────────────────────────────────────────────────────────────

/** Currencies without minor units, and the ones with three (ISO 4217). */
const ZERO_DECIMALS = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
const THREE_DECIMALS = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

export const currencyDigits = (currency: string): number => (ZERO_DECIMALS.has(currency.toUpperCase()) ? 0 : THREE_DECIMALS.has(currency.toUpperCase()) ? 3 : 2);

/** 999 USD → "9.99" (PayPal and display). */
export const toMajorUnits = (amount: number, currency: string): string => (amount / 10 ** currencyDigits(currency)).toFixed(currencyDigits(currency));

/** "9.99" USD → 999. */
export const toMinorUnits = (value: string | number, currency: string): number => Math.round(Number(value) * 10 ** currencyDigits(currency));

// ── views (what the API returns) ─────────────────────────────────────────────

const iso = (date: Date | null) => (date ? date.toISOString() : null);

export const toProductView = (p: Product) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  kind: p.kind,
  price: p.price,
  currency: p.currency,
  displayPrice: `${toMajorUnits(p.price, p.currency)} ${p.currency}`,
  accessLevel: p.accessLevel,
  durationDays: p.durationDays,
  appleProductId: p.appleProductId,
  googleProductId: p.googleProductId,
  active: p.active,
  sortOrder: p.sortOrder,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});
export type ProductView = ReturnType<typeof toProductView>;

export const toEntitlementView = (e: Entitlement, now = new Date()) => ({
  id: e.id,
  userId: e.userId,
  accessLevel: e.accessLevel,
  source: e.source,
  productId: e.productId,
  referenceId: e.referenceId,
  expiresAt: iso(e.expiresAt),
  revokedAt: iso(e.revokedAt),
  active: isEntitlementActive(e, now),
  createdAt: e.createdAt.toISOString(),
});
export type EntitlementView = ReturnType<typeof toEntitlementView>;
{{#if GATEWAY}}

export const toPaymentView = (p: Payment) => ({
  id: p.id,
  userId: p.userId,
  productId: p.productId,
  provider: p.provider,
  providerOrderId: p.providerOrderId,
  providerPaymentId: p.providerPaymentId,
  amount: p.amount,
  currency: p.currency,
  displayAmount: `${toMajorUnits(p.amount, p.currency)} ${p.currency}`,
  status: p.status,
  refundedAmount: p.refundedAmount,
  failureReason: p.failureReason,
  paidAt: iso(p.paidAt),
  createdAt: p.createdAt.toISOString(),
});
export type PaymentView = ReturnType<typeof toPaymentView>;
{{/if}}
{{#if IAP}}

export const toPurchaseView = (p: Purchase) => ({
  id: p.id,
  userId: p.userId,
  productId: p.productId,
  store: p.store,
  storeProductId: p.storeProductId,
  transactionId: p.transactionId,
  originalTransactionId: p.originalTransactionId,
  status: p.status,
  environment: p.environment,
  purchasedAt: p.purchasedAt.toISOString(),
  expiresAt: iso(p.expiresAt),
  createdAt: p.createdAt.toISOString(),
});
export type PurchaseView = ReturnType<typeof toPurchaseView>;
{{/if}}
