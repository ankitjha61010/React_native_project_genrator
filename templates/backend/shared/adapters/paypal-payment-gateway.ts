import { BadGatewayError, BadRequestError, ServiceUnavailableError } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import { toMajorUnits, toMinorUnits } from '{{IMPORT:domain.payments}}';
import type { CreateOrderInput, GatewayConfirmation, GatewayOrder, GatewayWebhookEvent, PaymentGateway } from '{{IMPORT:port.paymentGateway}}';
import { PAYMENTS_MESSAGES } from '{{IMPORT:messages.payments}}';

export interface PayPalSettings {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  /** https://api-m.sandbox.paypal.com or https://api-m.paypal.com */
  apiUrl: string;
  returnUrl: string;
  cancelUrl: string;
  appName: string;
}

/** Empty, or a dummy value written by the generator. */
const missing = (value: string) => !value || value.includes('REPLACE_ME');

interface PayPalCapture {
  id: string;
  status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED' | 'FAILED';
}

interface PayPalOrder {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  links?: Array<{ rel: string; href: string }>;
  purchase_units?: Array<{ amount?: { currency_code: string }; payments?: { captures?: PayPalCapture[] } }>;
}

const captureOf = (order: PayPalOrder) => order.purchase_units?.[0]?.payments?.captures?.[0];

/**
 * PayPal Orders v2 over REST. The app opens the approval URL in a web view; when PayPal sends the
 * buyer back to `returnUrl` the app calls confirm, which captures the order here.
 */
export class PayPalPaymentGateway implements PaymentGateway {
  readonly name = 'paypal' as const;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly settings: PayPalSettings,
    private readonly logger: Logger,
  ) {}

  private async accessToken(): Promise<string> {
    if (missing(this.settings.clientId) || missing(this.settings.clientSecret)) {
      throw new ServiceUnavailableError(PAYMENTS_MESSAGES.notConfigured('PayPal', 'PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET'));
    }
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const auth = Buffer.from(`${this.settings.clientId}:${this.settings.clientSecret}`).toString('base64');
    const response = await fetch(`${this.settings.apiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    }).catch(() => null);
    const json = (await response?.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
    if (!response?.ok || !json?.access_token) {
      this.logger.error({ status: response?.status }, 'PayPal: getting an access token failed');
      throw new BadGatewayError(PAYMENTS_MESSAGES.providerError('PayPal'));
    }
    this.token = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 300) * 1000 };
    return json.access_token;
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
    const token = await this.accessToken();
    const response = await fetch(`${this.settings.apiUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }).catch(error => {
      this.logger.error({ err: error, path }, 'PayPal unreachable');
      throw new BadGatewayError(PAYMENTS_MESSAGES.providerError('PayPal'));
    });
    const json = (await response.json().catch(() => ({}))) as T;
    if (!response.ok) {
      this.logger.error({ status: response.status, path, body: json }, 'PayPal request failed');
      throw new BadGatewayError(PAYMENTS_MESSAGES.providerError('PayPal'));
    }
    return json;
  }

  async createOrder(input: CreateOrderInput): Promise<GatewayOrder> {
    const order = await this.request<PayPalOrder>('POST', '/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: input.productId,
          custom_id: input.userId,
          description: input.description.slice(0, 127),
          amount: { currency_code: input.currency.toUpperCase(), value: toMajorUnits(input.amount, input.currency) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: this.settings.appName.slice(0, 127),
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: this.settings.returnUrl,
            cancel_url: this.settings.cancelUrl,
          },
        },
      },
    });
    const approvalUrl = order.links?.find(link => link.rel === 'payer-action' || link.rel === 'approve')?.href ?? null;
    return {
      providerOrderId: order.id,
      client: { orderId: order.id, approvalUrl, returnUrl: this.settings.returnUrl, cancelUrl: this.settings.cancelUrl },
    };
  }

  async confirm(providerOrderId: string): Promise<GatewayConfirmation> {
    let order = await this.request<PayPalOrder>('GET', `/v2/checkout/orders/${encodeURIComponent(providerOrderId)}`);
    if (order.status === 'APPROVED') {
      // PayPal-Request-Id: capturing twice (app + webhook retry) returns the same capture.
      order = await this.request<PayPalOrder>('POST', `/v2/checkout/orders/${encodeURIComponent(providerOrderId)}/capture`, {}, { 'PayPal-Request-Id': `capture-${providerOrderId}` });
    }
    const capture = captureOf(order);
    if (order.status === 'COMPLETED' && capture && ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(capture.status)) {
      return { status: 'paid', providerPaymentId: capture.id };
    }
    if (capture && (capture.status === 'DECLINED' || capture.status === 'FAILED')) {
      return { status: 'failed', providerPaymentId: capture.id, failureReason: `PayPal capture ${capture.status.toLowerCase()}` };
    }
    if (order.status === 'VOIDED') return { status: 'failed', providerPaymentId: null, failureReason: 'PayPal order voided' };
    return { status: 'pending', providerPaymentId: capture?.id ?? null };
  }

  async refund(input: { providerPaymentId: string; amount: number; currency: string }): Promise<{ refundId: string }> {
    const refund = await this.request<{ id: string }>('POST', `/v2/payments/captures/${encodeURIComponent(input.providerPaymentId)}/refund`, {
      amount: { value: toMajorUnits(input.amount, input.currency), currency_code: input.currency.toUpperCase() },
    });
    return { refundId: refund.id };
  }

  async parseWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): Promise<GatewayWebhookEvent> {
    if (missing(this.settings.webhookId)) {
      throw new ServiceUnavailableError(PAYMENTS_MESSAGES.notConfigured('PayPal webhooks', 'PAYPAL_WEBHOOK_ID'));
    }
    const event = JSON.parse(rawBody.toString('utf8')) as {
      event_type: string;
      resource: {
        id: string;
        status?: string;
        amount?: { value: string; currency_code: string };
        seller_payable_breakdown?: { total_refunded_amount?: { value: string; currency_code: string } };
        supplementary_data?: { related_ids?: { order_id?: string } };
        links?: Array<{ rel: string; href: string }>;
      };
    };
    // PayPal checks the signature itself (the certificate chain lives with PayPal).
    const verification = await this.request<{ verification_status: string }>('POST', '/v1/notifications/verify-webhook-signature', {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: this.settings.webhookId,
      webhook_event: event,
    });
    if (verification.verification_status !== 'SUCCESS') throw new BadRequestError(PAYMENTS_MESSAGES.invalidWebhook);

    const resource = event.resource;
    const orderId = resource.supplementary_data?.related_ids?.order_id ?? null;
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        return orderId ? { type: 'paid', providerOrderId: orderId, providerPaymentId: resource.id } : { type: 'ignored' };
      case 'PAYMENT.CAPTURE.DENIED':
        return orderId ? { type: 'failed', providerOrderId: orderId, failureReason: 'PayPal capture denied' } : { type: 'ignored' };
      case 'PAYMENT.CAPTURE.REFUNDED': {
        // The resource is the refund; its "up" link points at the capture.
        const captureId = resource.links?.find(link => link.rel === 'up')?.href.split('/').pop() ?? null;
        const total = resource.seller_payable_breakdown?.total_refunded_amount ?? resource.amount;
        if (!total) return { type: 'ignored' };
        return { type: 'refunded', providerOrderId: orderId, providerPaymentId: captureId, refundedAmount: toMinorUnits(total.value, total.currency_code) };
      }
      default:
        return { type: 'ignored' };
    }
  }
}
