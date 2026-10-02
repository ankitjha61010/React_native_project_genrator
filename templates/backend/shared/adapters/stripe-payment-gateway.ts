import { Stripe } from 'stripe';
import { BadGatewayError, BadRequestError, ServiceUnavailableError } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { CreateOrderInput, GatewayConfirmation, GatewayOrder, GatewayWebhookEvent, PaymentGateway } from '{{IMPORT:port.paymentGateway}}';
import { PAYMENTS_MESSAGES } from '{{IMPORT:messages.payments}}';

export interface StripeSettings {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

/** Empty, or a dummy value written by the generator. */
const missing = (value: string) => !value || value.includes('REPLACE_ME');

/**
 * Stripe PaymentIntents. The app opens Stripe's PaymentSheet with the intent's client secret
 * (cards, Apple Pay, Google Pay…); the webhook (or the app's confirm call) marks it paid.
 */
export class StripePaymentGateway implements PaymentGateway {
  readonly name = 'stripe' as const;
  private client: Stripe | null = null;

  constructor(
    private readonly settings: StripeSettings,
    private readonly logger: Logger,
  ) {}

  private stripe(): Stripe {
    if (missing(this.settings.secretKey) || missing(this.settings.publishableKey)) {
      throw new ServiceUnavailableError(PAYMENTS_MESSAGES.notConfigured('Stripe', 'STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY'));
    }
    this.client ??= new Stripe(this.settings.secretKey);
    return this.client;
  }

  /** Stripe's errors carry details for the logs; the client gets a generic message. */
  private async call<T>(what: string, request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (error instanceof ServiceUnavailableError) throw error;
      this.logger.error({ err: error }, `Stripe: ${what} failed`);
      throw new BadGatewayError(PAYMENTS_MESSAGES.providerError('Stripe'));
    }
  }

  async createOrder(input: CreateOrderInput): Promise<GatewayOrder> {
    const stripe = this.stripe();
    const intent = await this.call('create PaymentIntent', () =>
      stripe.paymentIntents.create({
        amount: input.amount,
        currency: input.currency.toLowerCase(),
        description: input.description,
        automatic_payment_methods: { enabled: true },
        ...(input.customerEmail ? { receipt_email: input.customerEmail } : {}),
        metadata: { userId: input.userId, productId: input.productId },
      }),
    );
    return {
      providerOrderId: intent.id,
      client: { clientSecret: intent.client_secret, publishableKey: this.settings.publishableKey },
    };
  }

  async confirm(providerOrderId: string): Promise<GatewayConfirmation> {
    const stripe = this.stripe();
    const intent = await this.call('retrieve PaymentIntent', () => stripe.paymentIntents.retrieve(providerOrderId));
    const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : (intent.latest_charge?.id ?? null);
    if (intent.status === 'succeeded') return { status: 'paid', providerPaymentId: chargeId };
    if (intent.status === 'canceled' || intent.status === 'requires_payment_method') {
      return { status: intent.last_payment_error ? 'failed' : 'pending', providerPaymentId: chargeId, failureReason: intent.last_payment_error?.message };
    }
    return { status: 'pending', providerPaymentId: chargeId };
  }

  async refund(input: { providerOrderId: string; amount: number }): Promise<{ refundId: string }> {
    const stripe = this.stripe();
    const refund = await this.call('refund', () => stripe.refunds.create({ payment_intent: input.providerOrderId, amount: input.amount }));
    return { refundId: refund.id };
  }

  async parseWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): Promise<GatewayWebhookEvent> {
    if (missing(this.settings.webhookSecret)) {
      throw new ServiceUnavailableError(PAYMENTS_MESSAGES.notConfigured('Stripe webhooks', 'STRIPE_WEBHOOK_SECRET'));
    }
    let event: Stripe.Event;
    try {
      event = this.stripe().webhooks.constructEvent(rawBody, headers['stripe-signature'] ?? '', this.settings.webhookSecret);
    } catch (error) {
      if (error instanceof ServiceUnavailableError) throw error;
      throw new BadRequestError(PAYMENTS_MESSAGES.invalidWebhook);
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : (intent.latest_charge?.id ?? null);
        return { type: 'paid', providerOrderId: intent.id, providerPaymentId: chargeId };
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        return { type: 'failed', providerOrderId: intent.id, failureReason: intent.last_payment_error?.message ?? 'Payment failed' };
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : (charge.payment_intent?.id ?? null);
        return { type: 'refunded', providerOrderId: intentId, providerPaymentId: charge.id, refundedAmount: charge.amount_refunded };
      }
      default:
        return { type: 'ignored' };
    }
  }
}
