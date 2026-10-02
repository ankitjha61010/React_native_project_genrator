import { timingSafeEqual } from 'node:crypto';
import { BadGatewayError, ServiceUnavailableError } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { AdaptyAccessLevel, AdaptyClient } from '{{IMPORT:port.inAppPurchases}}';
import { PAYMENTS_MESSAGES } from '{{IMPORT:messages.payments}}';

export interface AdaptySettings {
  secretKey: string;
  webhookToken: string;
}

const API = 'https://api.adapty.io/api/v2/server-side-api';

/** Empty, or a dummy value written by the generator. */
const missing = (value: string) => !value || value.includes('REPLACE_ME');

/** An access level as the server-side API returns it (snake_case, ISO dates). */
interface RawAccessLevel {
  access_level_id: string;
  store?: string | null;
  store_product_id?: string | null;
  store_transaction_id?: string | null;
  store_original_transaction_id?: string | null;
  purchased_at?: string | null;
  expires_at?: string | null;
  is_lifetime?: boolean;
  is_refund?: boolean;
}

const date = (value?: string | null) => (value ? new Date(value) : null);

/**
 * Adapty server-side API. Adapty validates the store receipts; this backend only mirrors the
 * profile's access levels into entitlements (on every webhook and when the app asks to sync).
 */
export class AdaptyServerClient implements AdaptyClient {
  constructor(
    private readonly settings: AdaptySettings,
    private readonly logger: Logger,
  ) {}

  isValidWebhook(authorization: string | undefined): boolean {
    const expected = this.settings.webhookToken;
    if (missing(expected) || !authorization) return false;
    const received = authorization.replace(/^Bearer\s+/i, '');
    return received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  }

  async accessLevels(customerUserId: string): Promise<AdaptyAccessLevel[]> {
    if (missing(this.settings.secretKey)) {
      throw new ServiceUnavailableError(PAYMENTS_MESSAGES.notConfigured('Adapty', 'ADAPTY_SECRET_KEY'));
    }
    const response = await fetch(`${API}/profile/`, {
      headers: { Authorization: `Api-Key ${this.settings.secretKey}`, 'adapty-customer-user-id': customerUserId, Accept: 'application/json' },
    }).catch(error => {
      this.logger.error({ err: error }, 'Adapty unreachable');
      throw new BadGatewayError(PAYMENTS_MESSAGES.providerError('Adapty'));
    });
    // The app hasn't called adapty.identify() for this user yet – nothing bought.
    if (response.status === 404) return [];
    if (!response.ok) {
      this.logger.error({ status: response.status, body: await response.text().catch(() => '') }, 'Adapty request failed');
      throw new BadGatewayError(PAYMENTS_MESSAGES.providerError('Adapty'));
    }
    const json = (await response.json()) as { data?: { access_levels?: RawAccessLevel[] } };
    const now = Date.now();
    return (json.data?.access_levels ?? []).map(level => {
      const expiresAt = level.is_lifetime ? null : date(level.expires_at);
      return {
        accessLevel: level.access_level_id,
        isActive: !level.is_refund && (!expiresAt || expiresAt.getTime() > now),
        expiresAt,
        store: level.store ?? null,
        vendorProductId: level.store_product_id ?? null,
        transactionId: level.store_transaction_id ?? null,
        originalTransactionId: level.store_original_transaction_id ?? null,
        purchasedAt: date(level.purchased_at),
        isRefund: Boolean(level.is_refund),
      };
    });
  }
}
