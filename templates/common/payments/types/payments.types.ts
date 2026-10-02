/** The backend's payment views (see the backend's docs/PAYMENTS.md). */

export type ProductKind = 'one_time' | 'subscription';

/** A product from the catalog (admin panel → Payments → Products). Prices are in minor units. */
export interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;
  kind: ProductKind;
  price: number;
  currency: string;
  displayPrice: string;
  accessLevel: string;
  durationDays: number | null;
  appleProductId: string | null;
  googleProductId: string | null;
}

export interface Entitlement {
  id: string;
  accessLevel: string;
  source: 'gateway' | 'app_store' | 'play_store' | 'adapty' | 'admin';
  expiresAt: string | null;
  active: boolean;
}

/** What the signed-in user can use right now – e.g. accessLevels ["premium"]. */
export interface Access {
  accessLevels: string[];
  entitlements: Entitlement[];
}
{{#if GATEWAY}}

export interface Checkout {
  paymentId: string;
  provider: 'stripe' | 'razorpay' | 'paypal';
  amount: number;
  currency: string;
  product: CatalogProduct;
  /** Provider specific (client secret / key id + order id / approval URL). */
  client: Record<string, string | number | null>;
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface Payment {
  id: string;
  productId: string;
  amount: number;
  currency: string;
  displayAmount: string;
  status: PaymentStatus;
  createdAt: string;
}
{{/if}}

/** A catalog product + the store's localized price (in-app purchases). */
export interface StoreItem {
  product: CatalogProduct;
  /** How it is bought: in the store (App Store / Google Play) or through the payment gateway. */
  channel: 'store' | 'gateway';
  /** The store's localized price when known, else the catalog price. */
  displayPrice: string;
}

/** How a purchase ended. */
export type PurchaseOutcome = 'purchased' | 'pending' | 'cancelled';
