import type { ErrorMessage } from '{{IMPORT:core.messages}}';

/** Every message of the payments feature – change the wording here. */
export const PAYMENTS_MESSAGES = {
  products: 'Products',
  product: 'Product',
  productCreated: 'Product created',
  productUpdated: 'Product updated',
  productDeleted: 'Product deleted',
  myAccess: 'Your access',
  entitlements: 'Entitlements',
  entitlementGranted: 'Access granted',
  entitlementRevoked: 'Access revoked',
  stats: 'Payment statistics',
  webhookReceived: 'Webhook received',
{{#if GATEWAY}}
  checkoutCreated: 'Checkout created',
  paymentConfirmed: 'Payment confirmed',
  paymentPending: 'Payment is still being processed',
  payments: 'Payments',
  payment: 'Payment',
  refunded: 'Payment refunded',
{{/if}}
{{#if GATEWAY_PAYPAL}}
  // The page PayPal sends the buyer back to (the app's web view normally closes before it shows).
  paypalApproved: 'Payment approved – you can return to the app.',
  paypalCancelled: 'Payment cancelled – you can return to the app.',
{{/if}}
{{#if IAP}}
  purchases: 'Purchases',
{{/if}}
{{#if IAP_NATIVE}}
  purchaseVerified: 'Purchase verified',
{{/if}}
{{#if IAP_ADAPTY}}
  synced: 'Access synced with Adapty',
{{/if}}
  // ── errors ─────────────────────────────────────────────────────────────────
  productNotFound: { message: 'Product not found', code: 'PRODUCT_NOT_FOUND' },
  productUnavailable: { message: 'This product is not available', code: 'PRODUCT_UNAVAILABLE' },
  entitlementNotFound: { message: 'Entitlement not found', code: 'ENTITLEMENT_NOT_FOUND' },
  userNotFound: { message: 'User not found', code: 'USER_NOT_FOUND' },
  invalidWebhook: { message: 'Invalid webhook signature', code: 'INVALID_WEBHOOK_SIGNATURE' },
  notConfigured: (provider: string, keys: string): ErrorMessage => ({
    message: `${provider} is not configured – set ${keys} in the backend .env`,
    code: 'PAYMENTS_NOT_CONFIGURED',
  }),
  providerError: (provider: string): ErrorMessage => ({ message: `${provider} rejected the request – try again later`, code: 'PAYMENT_PROVIDER_ERROR' }),
{{#if GATEWAY}}
  paymentNotFound: { message: 'Payment not found', code: 'PAYMENT_NOT_FOUND' },
  freeProduct: { message: 'Free products cannot be paid for', code: 'PRODUCT_NOT_PURCHASABLE' },
  paymentFailed: { message: 'The payment failed', code: 'PAYMENT_FAILED' },
  notRefundable: { message: 'Only paid payments can be refunded', code: 'NOT_REFUNDABLE' },
  refundTooLarge: { message: 'The refund is larger than what is left to refund', code: 'REFUND_TOO_LARGE' },
{{/if}}
{{#if IAP_NATIVE}}
  unknownStoreProduct: { message: 'This store product is not in the catalog (admin panel → Payments → Products)', code: 'UNKNOWN_STORE_PRODUCT' },
  purchaseNotFound: { message: 'The store has no such purchase', code: 'STORE_PURCHASE_NOT_FOUND' },
  purchaseMismatch: { message: 'The purchase does not belong to this app or product', code: 'STORE_PURCHASE_MISMATCH' },
  purchaseOwnedByOther: { message: 'This purchase belongs to another account', code: 'PURCHASE_OWNED_BY_OTHER_USER' },
  missingPurchaseToken: { message: 'transactionId (iOS) or purchaseToken (Android) is required', code: 'MISSING_PURCHASE_TOKEN' },
{{/if}}
} as const satisfies Record<string, string | ErrorMessage | ((...args: never[]) => ErrorMessage)>;
