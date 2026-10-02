import type { PaymentProvider } from '{{IMPORT:domain.payments}}';

export interface CreateOrderInput {
  /** Minor units. */
  amount: number;
  currency: string;
  /** Shown on the provider's checkout / receipt. */
  description: string;
  userId: string;
  productId: string;
  customerEmail: string | null;
}

/** A provider order + what the app needs to open the provider's checkout. */
export interface GatewayOrder {
  providerOrderId: string;
  /** Sent to the app as-is (client secret, key id, approval URL…). Never contains a secret key. */
  client: Record<string, string | number | null>;
}

export interface GatewayConfirmation {
  status: 'paid' | 'pending' | 'failed';
  providerPaymentId: string | null;
  failureReason?: string;
}

/** A webhook, reduced to what the payments service acts on. */
export type GatewayWebhookEvent =
  | { type: 'paid'; providerOrderId: string; providerPaymentId: string | null }
  | { type: 'failed'; providerOrderId: string; failureReason: string }
  /** `refundedAmount`: the total refunded so far (minor units). */
  | { type: 'refunded'; providerOrderId: string | null; providerPaymentId: string | null; refundedAmount: number }
  | { type: 'ignored' };

/**
 * One payment provider (src: {{GATEWAY_NAME}}). The payments service only talks to this interface –
 * switching providers means another implementation, not another service.
 */
export interface PaymentGateway {
  readonly name: PaymentProvider;
  createOrder(input: CreateOrderInput): Promise<GatewayOrder>;
  /** Asks the provider for the order's state (the app's "I paid" is never trusted on its own). */
  confirm(providerOrderId: string, input: Record<string, string>): Promise<GatewayConfirmation>;
  refund(input: { providerOrderId: string; providerPaymentId: string; amount: number; currency: string }): Promise<{ refundId: string }>;
  /** Verifies the signature (throws when it's wrong) and maps the event. */
  parseWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): Promise<GatewayWebhookEvent>;
}
