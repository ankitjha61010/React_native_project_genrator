import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { BadGatewayError, BadRequestError, ServiceUnavailableError } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { CreateOrderInput, GatewayConfirmation, GatewayOrder, GatewayWebhookEvent, PaymentGateway } from '{{IMPORT:port.paymentGateway}}';
import { PAYMENTS_MESSAGES } from '{{IMPORT:messages.payments}}';

export interface RazorpaySettings {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  /** Shown in Razorpay Checkout. */
  appName: string;
}

const API = 'https://api.razorpay.com/v1';

/** Empty, or a dummy value written by the generator. */
const missing = (value: string) => !value || value.includes('REPLACE_ME');

const hmac = (secret: string, data: string | Buffer) => createHmac('sha256', secret).update(data).digest('hex');

/** Constant-time comparison of two hex signatures. */
function sameSignature(expected: string, received: string | undefined): boolean {
  if (!received || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

interface RazorpayPayment {
  id: string;
  order_id: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  amount: number;
  currency: string;
  amount_refunded?: number;
  error_description?: string | null;
}

/**
 * Razorpay Orders + Checkout (cards, UPI, net banking, wallets), over its REST API.
 * The app opens Razorpay Checkout with the order id and sends back the payment id + signature;
 * the signature is checked here, then the payment is fetched (and captured if needed).
 */
export class RazorpayPaymentGateway implements PaymentGateway {
  readonly name = 'razorpay' as const;

  constructor(
    private readonly settings: RazorpaySettings,
    private readonly logger: Logger,
  ) {}

  private assertConfigured(): void {
    if (missing(this.settings.keyId) || missing(this.settings.keySecret)) {
      throw new ServiceUnavailableError(PAYMENTS_MESSAGES.notConfigured('Razorpay', 'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET'));
    }
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    this.assertConfigured();
    const auth = Buffer.from(`${this.settings.keyId}:${this.settings.keySecret}`).toString('base64');
    const response = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }).catch(error => {
      this.logger.error({ err: error, path }, 'Razorpay unreachable');
      throw new BadGatewayError(PAYMENTS_MESSAGES.providerError('Razorpay'));
    });
    const json = (await response.json().catch(() => ({}))) as T & { error?: { description?: string } };
    if (!response.ok) {
      this.logger.error({ status: response.status, path, error: json.error }, 'Razorpay request failed');
      throw new BadGatewayError(PAYMENTS_MESSAGES.providerError('Razorpay'));
    }
    return json;
  }

  async createOrder(input: CreateOrderInput): Promise<GatewayOrder> {
    const order = await this.request<{ id: string }>('POST', '/orders', {
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      // At most 40 characters.
      receipt: randomUUID().replace(/-/g, '').slice(0, 32),
      notes: { userId: input.userId, productId: input.productId },
    });
    return {
      providerOrderId: order.id,
      client: {
        keyId: this.settings.keyId,
        orderId: order.id,
        amount: input.amount,
        currency: input.currency.toUpperCase(),
        name: this.settings.appName,
        description: input.description,
        email: input.customerEmail,
      },
    };
  }

  /** `input`: razorpayPaymentId + razorpaySignature from Razorpay Checkout's success callback. */
  async confirm(providerOrderId: string, input: Record<string, string>): Promise<GatewayConfirmation> {
    this.assertConfigured();
    const paymentId = input.razorpayPaymentId;
    if (!paymentId || !sameSignature(hmac(this.settings.keySecret, `${providerOrderId}|${paymentId}`), input.razorpaySignature)) {
      throw new BadRequestError(PAYMENTS_MESSAGES.invalidWebhook);
    }
    let payment = await this.request<RazorpayPayment>('GET', `/payments/${encodeURIComponent(paymentId)}`);
    if (payment.order_id !== providerOrderId) throw new BadRequestError(PAYMENTS_MESSAGES.invalidWebhook);
    // Manual capture accounts: capture it now (automatic capture is Razorpay's default).
    if (payment.status === 'authorized') {
      payment = await this.request<RazorpayPayment>('POST', `/payments/${encodeURIComponent(paymentId)}/capture`, { amount: payment.amount, currency: payment.currency });
    }
    if (payment.status === 'captured' || payment.status === 'refunded') return { status: 'paid', providerPaymentId: payment.id };
    if (payment.status === 'failed') return { status: 'failed', providerPaymentId: payment.id, failureReason: payment.error_description ?? 'Payment failed' };
    return { status: 'pending', providerPaymentId: payment.id };
  }

  async refund(input: { providerPaymentId: string; amount: number }): Promise<{ refundId: string }> {
    const refund = await this.request<{ id: string }>('POST', `/payments/${encodeURIComponent(input.providerPaymentId)}/refund`, { amount: input.amount });
    return { refundId: refund.id };
  }

  async parseWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): Promise<GatewayWebhookEvent> {
    if (missing(this.settings.webhookSecret)) {
      throw new ServiceUnavailableError(PAYMENTS_MESSAGES.notConfigured('Razorpay webhooks', 'RAZORPAY_WEBHOOK_SECRET'));
    }
    if (!sameSignature(hmac(this.settings.webhookSecret, rawBody), headers['x-razorpay-signature'])) {
      throw new BadRequestError(PAYMENTS_MESSAGES.invalidWebhook);
    }
    const event = JSON.parse(rawBody.toString('utf8')) as {
      event: string;
      payload: { payment?: { entity: RazorpayPayment }; refund?: { entity: { payment_id: string; amount: number } } };
    };
    const payment = event.payload.payment?.entity;
    switch (event.event) {
      case 'payment.captured':
        return payment ? { type: 'paid', providerOrderId: payment.order_id, providerPaymentId: payment.id } : { type: 'ignored' };
      case 'payment.failed':
        return payment ? { type: 'failed', providerOrderId: payment.order_id, failureReason: payment.error_description ?? 'Payment failed' } : { type: 'ignored' };
      case 'refund.processed': {
        const refund = event.payload.refund?.entity;
        if (!refund) return { type: 'ignored' };
        return { type: 'refunded', providerOrderId: payment?.order_id ?? null, providerPaymentId: refund.payment_id, refundedAmount: payment?.amount_refunded ?? refund.amount };
      }
      default:
        return { type: 'ignored' };
    }
  }
}
