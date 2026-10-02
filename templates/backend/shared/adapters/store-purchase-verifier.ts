import { createSign, sign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { BadGatewayError, BadRequestError, NotFoundError, ServiceUnavailableError } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { PurchaseStatus } from '{{IMPORT:domain.payments}}';
import type { StorePurchaseInput, StorePurchaseVerifier, VerifiedPurchase } from '{{IMPORT:port.inAppPurchases}}';
import { PAYMENTS_MESSAGES } from '{{IMPORT:messages.payments}}';

export interface StoreVerifierSettings {
  apple: { issuerId: string; keyId: string; privateKey: string; bundleId: string };
  google: { serviceAccount: string; packageName: string };
  /** Development only – trust the app (IAP_SKIP_VERIFICATION). */
  skipVerification: boolean;
}

/** Empty, or a dummy value written by the generator. */
const missing = (value: string) => !value || value.includes('REPLACE_ME');
const base64url = (value: string | Buffer) => Buffer.from(value).toString('base64url');

/** A PEM, or the path of a file holding one / a JSON key. */
function readSecret(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.startsWith('{') || trimmed.includes('PRIVATE KEY')) return trimmed;
  return existsSync(trimmed) ? readFileSync(trimmed, 'utf8') : null;
}

const APPLE_PRODUCTION = 'https://api.storekit.itunes.apple.com';
const APPLE_SANDBOX = 'https://api.storekit-sandbox.itunes.apple.com';
const GOOGLE_API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

/** The decoded `signedTransactionInfo` (fetched from Apple over TLS with our key, so trusted as-is). */
interface AppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  purchaseDate: number;
  expiresDate?: number;
  revocationDate?: number;
  environment: string;
}

/**
 * Verifies react-native-iap purchases with the stores – never on the app's word:
 * - iOS: App Store Server API (`/inApps/v1/transactions/{id}`, production then sandbox).
 * - Android: Google Play Developer API (subscriptionsv2 / products).
 */
export class StoreApiPurchaseVerifier implements StorePurchaseVerifier {
  private googleToken: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly settings: StoreVerifierSettings,
    private readonly logger: Logger,
  ) {}

  async verify(input: StorePurchaseInput): Promise<VerifiedPurchase> {
    const id = input.platform === 'ios' ? input.transactionId : input.purchaseToken;
    if (!id) throw new BadRequestError(PAYMENTS_MESSAGES.missingPurchaseToken);
    if (this.settings.skipVerification) {
      this.logger.warn({ productId: input.productId }, 'IAP_SKIP_VERIFICATION=true – purchase NOT verified with the store');
      return {
        store: input.platform === 'ios' ? 'app_store' : 'play_store',
        storeProductId: input.productId,
        transactionId: id,
        originalTransactionId: id,
        status: 'active',
        environment: 'Unverified',
        purchasedAt: new Date(),
        expiresAt: null,
      };
    }
    return input.platform === 'ios' ? this.verifyApple(id, input.productId) : this.verifyGoogle(id, input);
  }

  // ── Apple ──────────────────────────────────────────────────────────────────

  private appleJwt(): string {
    const { issuerId, keyId, privateKey, bundleId } = this.settings.apple;
    const key = missing(privateKey) ? null : readSecret(privateKey);
    if (missing(issuerId) || missing(keyId) || !key) {
      throw new ServiceUnavailableError(PAYMENTS_MESSAGES.notConfigured('App Store verification', 'APPLE_IAP_ISSUER_ID / APPLE_IAP_KEY_ID / APPLE_IAP_PRIVATE_KEY'));
    }
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${base64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }))}.${base64url(JSON.stringify({ iss: issuerId, iat: now, exp: now + 1800, aud: 'appstoreconnect-v1', bid: bundleId }))}`;
    // JWTs need the raw r‖s signature, not DER.
    const signature = sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' });
    return `${unsigned}.${base64url(signature)}`;
  }

  private async appleTransaction(transactionId: string): Promise<AppleTransaction> {
    const token = this.appleJwt();
    // Apple's advice: ask production first, then the sandbox (TestFlight / Xcode purchases).
    for (const host of [APPLE_PRODUCTION, APPLE_SANDBOX]) {
      const response = await fetch(`${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, { headers: { Authorization: `Bearer ${token}` } }).catch(error => {
        this.logger.error({ err: error }, 'App Store Server API unreachable');
        throw new BadGatewayError(PAYMENTS_MESSAGES.providerError('The App Store'));
      });
      if (response.status === 404) continue;
      if (!response.ok) {
        this.logger.error({ status: response.status, body: await response.text().catch(() => '') }, 'App Store Server API request failed');
        throw new BadGatewayError(PAYMENTS_MESSAGES.providerError('The App Store'));
      }
      const { signedTransactionInfo } = (await response.json()) as { signedTransactionInfo: string };
      return JSON.parse(Buffer.from(signedTransactionInfo.split('.')[1] ?? '', 'base64url').toString('utf8')) as AppleTransaction;
    }
    throw new NotFoundError(PAYMENTS_MESSAGES.purchaseNotFound);
  }

  private async verifyApple(transactionId: string, productId: string): Promise<VerifiedPurchase> {
    const t = await this.appleTransaction(transactionId);
    if (t.bundleId !== this.settings.apple.bundleId || t.productId !== productId) throw new BadRequestError(PAYMENTS_MESSAGES.purchaseMismatch);
    const expiresAt = t.expiresDate ? new Date(t.expiresDate) : null;
    const status: PurchaseStatus = t.revocationDate ? 'refunded' : expiresAt && expiresAt.getTime() <= Date.now() ? 'expired' : 'active';
    return {
      store: 'app_store',
      storeProductId: t.productId,
      transactionId: t.transactionId,
      originalTransactionId: t.originalTransactionId,
      status,
      environment: t.environment,
      purchasedAt: new Date(t.purchaseDate),
      expiresAt,
    };
  }

  // ── Google ─────────────────────────────────────────────────────────────────

  private async googleAccessToken(): Promise<string> {
    if (this.googleToken && this.googleToken.expiresAt > Date.now() + 60_000) return this.googleToken.value;
    const raw = missing(this.settings.google.serviceAccount) ? null : readSecret(this.settings.google.serviceAccount);
    const account = raw ? (JSON.parse(raw) as { client_email?: string; private_key?: string }) : null;
    if (!account?.client_email || !account.private_key) {
      throw new ServiceUnavailableError(PAYMENTS_MESSAGES.notConfigured('Google Play verification', 'GOOGLE_PLAY_SERVICE_ACCOUNT'));
    }
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(
      JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }),
    )}`;
    const signature = createSign('RSA-SHA256').update(unsigned).sign(account.private_key);
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${base64url(signature)}` }),
    }).catch(() => null);
    const json = (await response?.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
    if (!response?.ok || !json?.access_token) {
      this.logger.error({ status: response?.status }, 'Google OAuth token request failed');
      throw new BadGatewayError(PAYMENTS_MESSAGES.providerError('Google Play'));
    }
    this.googleToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return json.access_token;
  }

  private async googleGet<T>(path: string): Promise<T | null> {
    const response = await fetch(`${GOOGLE_API}/${encodeURIComponent(this.settings.google.packageName)}${path}`, {
      headers: { Authorization: `Bearer ${await this.googleAccessToken()}` },
    }).catch(error => {
      this.logger.error({ err: error }, 'Google Play Developer API unreachable');
      throw new BadGatewayError(PAYMENTS_MESSAGES.providerError('Google Play'));
    });
    // Unknown token / wrong type → null (the caller may try the other type).
    if (response.status === 404 || response.status === 400 || response.status === 410) return null;
    if (!response.ok) {
      this.logger.error({ status: response.status, body: await response.text().catch(() => '') }, 'Google Play Developer API request failed');
      throw new BadGatewayError(PAYMENTS_MESSAGES.providerError('Google Play'));
    }
    return (await response.json()) as T;
  }

  private async verifyGoogle(purchaseToken: string, input: StorePurchaseInput): Promise<VerifiedPurchase> {
    const token = encodeURIComponent(purchaseToken);
    if (input.type !== 'in-app') {
      const sub = await this.googleGet<{
        subscriptionState: string;
        latestOrderId?: string;
        startTime?: string;
        testPurchase?: object;
        lineItems?: Array<{ productId: string; expiryTime?: string }>;
      }>(`/purchases/subscriptionsv2/tokens/${token}`);
      if (sub) {
        const item = sub.lineItems?.find(line => line.productId === input.productId);
        if (!item) throw new BadRequestError(PAYMENTS_MESSAGES.purchaseMismatch);
        const expiresAt = item.expiryTime ? new Date(item.expiryTime) : null;
        const live = ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED'].includes(sub.subscriptionState);
        const status: PurchaseStatus =
          sub.subscriptionState === 'SUBSCRIPTION_STATE_PENDING' ? 'pending' : live && (!expiresAt || expiresAt.getTime() > Date.now()) ? 'active' : 'expired';
        return {
          store: 'play_store',
          storeProductId: item.productId,
          transactionId: sub.latestOrderId ?? purchaseToken,
          originalTransactionId: purchaseToken,
          status,
          environment: sub.testPurchase ? 'Sandbox' : 'Production',
          purchasedAt: sub.startTime ? new Date(sub.startTime) : new Date(),
          expiresAt,
        };
      }
      if (input.type === 'subs') throw new NotFoundError(PAYMENTS_MESSAGES.purchaseNotFound);
    }
    const product = await this.googleGet<{ purchaseState: number; orderId?: string; purchaseTimeMillis?: string; purchaseType?: number }>(
      `/purchases/products/${encodeURIComponent(input.productId)}/tokens/${token}`,
    );
    if (!product) throw new NotFoundError(PAYMENTS_MESSAGES.purchaseNotFound);
    // 0 purchased, 1 canceled (refunded), 2 pending.
    const status: PurchaseStatus = product.purchaseState === 0 ? 'active' : product.purchaseState === 2 ? 'pending' : 'refunded';
    return {
      store: 'play_store',
      storeProductId: input.productId,
      transactionId: product.orderId ?? purchaseToken,
      originalTransactionId: purchaseToken,
      status,
      environment: product.purchaseType === 0 ? 'Sandbox' : 'Production',
      purchasedAt: product.purchaseTimeMillis ? new Date(Number(product.purchaseTimeMillis)) : new Date(),
      expiresAt: null,
    };
  }
}
