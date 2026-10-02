/**
 * Payments: in-app purchases (App Store / Google Play) and a payment gateway.
 *
 * Both are optional and independent. Store rules: digital content and subscriptions used inside
 * the app must be sold through in-app purchases; a payment gateway is for physical goods and
 * real-world services (docs/PAYMENTS.md of the generated app explains this).
 */

/** In-app purchases: `iap` = react-native-iap (StoreKit 2 + Play Billing, the backend verifies with the stores); `adapty` = Adapty (managed subscriptions, paywalls, analytics). */
export type InAppPurchaseProvider = 'none' | 'iap' | 'adapty';

/** Payment gateway for card / UPI / wallet payments. */
export type PaymentGateway = 'none' | 'stripe' | 'razorpay' | 'paypal';

export const IAP_PROVIDERS: InAppPurchaseProvider[] = ['none', 'iap', 'adapty'];
export const PAYMENT_GATEWAYS: PaymentGateway[] = ['none', 'stripe', 'razorpay', 'paypal'];

export const IAP_LABELS: Record<InAppPurchaseProvider, string> = { none: 'none', iap: 'react-native-iap', adapty: 'Adapty' };
export const GATEWAY_LABELS: Record<PaymentGateway, string> = { none: 'none', stripe: 'Stripe', razorpay: 'Razorpay', paypal: 'PayPal' };

/**
 * Keys entered while generating ("Configure"). Anything left out is written as a dummy value
 * (see PAYMENT_PLACEHOLDERS) – the project runs, and payments answer "not configured" until the
 * real key is put in the .env file.
 */
export interface PaymentCredentials {
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  paypalClientId?: string;
  paypalClientSecret?: string;
  paypalWebhookId?: string;
  /** Adapty public SDK key – the only payment key written into the app. */
  adaptyPublicSdkKey?: string;
  /** Adapty secret API key (server-side API) – backend only. */
  adaptySecretKey?: string;
  /** App Store Server API key (App Store Connect → Users and Access → Integrations → In-App Purchase). */
  appleIapIssuerId?: string;
  appleIapKeyId?: string;
  /** Path to the downloaded SubscriptionKey_XXXX.p8 file. */
  appleIapPrivateKeyPath?: string;
  /** Path to the Google Cloud service account JSON with access to the Play Developer API. */
  googlePlayServiceAccountPath?: string;
}

/** The marker in every dummy value – the backend treats a value containing it as "not set". */
export const PLACEHOLDER_MARKER = 'REPLACE_ME';

export const PAYMENT_PLACEHOLDERS = {
  stripePublishableKey: `pk_test_${PLACEHOLDER_MARKER}`,
  stripeSecretKey: `sk_test_${PLACEHOLDER_MARKER}`,
  stripeWebhookSecret: `whsec_${PLACEHOLDER_MARKER}`,
  razorpayKeyId: `rzp_test_${PLACEHOLDER_MARKER}`,
  razorpayKeySecret: PLACEHOLDER_MARKER,
  razorpayWebhookSecret: PLACEHOLDER_MARKER,
  paypalClientId: PLACEHOLDER_MARKER,
  paypalClientSecret: PLACEHOLDER_MARKER,
  paypalWebhookId: PLACEHOLDER_MARKER,
  adaptyPublicSdkKey: `public_live_${PLACEHOLDER_MARKER}`,
  adaptySecretKey: `secret_live_${PLACEHOLDER_MARKER}`,
  appleIapIssuerId: PLACEHOLDER_MARKER,
  appleIapKeyId: PLACEHOLDER_MARKER,
  appleIapPrivateKeyPath: './keys/SubscriptionKey_REPLACE_ME.p8',
  googlePlayServiceAccountPath: './keys/google-play-service-account.json',
} as const satisfies Required<Record<keyof PaymentCredentials, string>>;

/** The values written to the .env files: the entered keys, or the dummy ones. */
export function paymentValues(credentials: PaymentCredentials = {}): Record<keyof PaymentCredentials, string> {
  const values = {} as Record<keyof PaymentCredentials, string>;
  for (const key of Object.keys(PAYMENT_PLACEHOLDERS) as Array<keyof PaymentCredentials>) {
    values[key] = credentials[key]?.trim() || PAYMENT_PLACEHOLDERS[key];
  }
  return values;
}

export function isIapProvider(value: string): value is InAppPurchaseProvider {
  return (IAP_PROVIDERS as string[]).includes(value);
}

export function isPaymentGateway(value: string): value is PaymentGateway {
  return (PAYMENT_GATEWAYS as string[]).includes(value);
}

/** Which keys belong to a provider (asked when "Configure" is picked, listed in docs/PAYMENTS.md). */
export const GATEWAY_KEYS: Record<Exclude<PaymentGateway, 'none'>, Array<{ key: keyof PaymentCredentials; label: string }>> = {
  stripe: [
    { key: 'stripePublishableKey', label: 'Stripe publishable key (pk_test_… / pk_live_…)' },
    { key: 'stripeSecretKey', label: 'Stripe secret key (sk_test_… / sk_live_…)' },
    { key: 'stripeWebhookSecret', label: 'Stripe webhook signing secret (whsec_…)' },
  ],
  razorpay: [
    { key: 'razorpayKeyId', label: 'Razorpay key id (rzp_test_… / rzp_live_…)' },
    { key: 'razorpayKeySecret', label: 'Razorpay key secret' },
    { key: 'razorpayWebhookSecret', label: 'Razorpay webhook secret' },
  ],
  paypal: [
    { key: 'paypalClientId', label: 'PayPal REST client id' },
    { key: 'paypalClientSecret', label: 'PayPal REST client secret' },
    { key: 'paypalWebhookId', label: 'PayPal webhook id' },
  ],
};

export const IAP_KEYS: Record<Exclude<InAppPurchaseProvider, 'none'>, Array<{ key: keyof PaymentCredentials; label: string }>> = {
  iap: [
    { key: 'appleIapIssuerId', label: 'App Store Server API issuer id' },
    { key: 'appleIapKeyId', label: 'App Store Server API key id' },
    { key: 'appleIapPrivateKeyPath', label: 'Path to the App Store Server API key (SubscriptionKey_XXXX.p8)' },
    { key: 'googlePlayServiceAccountPath', label: 'Path to the Google Play service account JSON' },
  ],
  adapty: [
    { key: 'adaptyPublicSdkKey', label: 'Adapty public SDK key (public_live_…)' },
    { key: 'adaptySecretKey', label: 'Adapty secret API key (secret_live_…)' },
  ],
};
