{{#if IAP_NATIVE}}
import type { PurchaseStatus, PurchaseStore } from '{{IMPORT:domain.payments}}';

/** What the app sends after a react-native-iap purchase. */
export interface StorePurchaseInput {
  platform: 'ios' | 'android';
  /** The store product id (App Store Connect / Google Play). */
  productId: string;
  /** iOS: StoreKit transaction id. */
  transactionId?: string;
  /** Android: Play Billing purchase token. */
  purchaseToken?: string;
  /** Android: in-app product or subscription. */
  type?: 'in-app' | 'subs';
}

/** The purchase as Apple / Google report it. */
export interface VerifiedPurchase {
  store: PurchaseStore;
  storeProductId: string;
  transactionId: string;
  originalTransactionId: string | null;
  status: PurchaseStatus;
  environment: string | null;
  purchasedAt: Date;
  expiresAt: Date | null;
}

/** Checks a purchase with the App Store Server API / Google Play Developer API. */
export interface StorePurchaseVerifier {
  verify(input: StorePurchaseInput): Promise<VerifiedPurchase>;
}
{{/if}}
{{#if IAP_ADAPTY}}
/** One access level of an Adapty profile. */
export interface AdaptyAccessLevel {
  accessLevel: string;
  isActive: boolean;
  expiresAt: Date | null;
  store: string | null;
  vendorProductId: string | null;
  transactionId: string | null;
  originalTransactionId: string | null;
  purchasedAt: Date | null;
  isRefund: boolean;
}

/** Adapty's server-side API (the app identifies itself with `adapty.identify(<our user id>)`). */
export interface AdaptyClient {
  /** The profile's access levels, looked up by customer user id (our user id). */
  accessLevels(customerUserId: string): Promise<AdaptyAccessLevel[]>;
  /** The Authorization header of a webhook equals ADAPTY_WEBHOOK_TOKEN. */
  isValidWebhook(authorization: string | undefined): boolean;
}
{{/if}}
