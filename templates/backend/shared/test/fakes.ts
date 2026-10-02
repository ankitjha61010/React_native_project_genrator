{{#if GATEWAY}}
import { BadRequestError } from '{{IMPORT:core.errors}}';
import type { CreateOrderInput, GatewayConfirmation, GatewayOrder, GatewayWebhookEvent, PaymentGateway } from '{{IMPORT:port.paymentGateway}}';
{{/if}}
{{#if IAP_NATIVE}}
import { NotFoundError } from '{{IMPORT:core.errors}}';
import type { StorePurchaseInput, StorePurchaseVerifier, VerifiedPurchase } from '{{IMPORT:port.inAppPurchases}}';
{{/if}}
{{#if IAP_ADAPTY}}
import type { AdaptyAccessLevel, AdaptyClient } from '{{IMPORT:port.inAppPurchases}}';
{{/if}}
{{#if PAYMENT_VERIFIERS}}
import { PAYMENTS_MESSAGES } from '{{IMPORT:messages.payments}}';
{{/if}}
{{#if UPLOADS}}
import { randomUUID } from 'node:crypto';
{{/if}}
{{#if SOCIAL}}
import { UnauthorizedError } from '{{IMPORT:core.errors}}';
import { AUTH_MESSAGES } from '{{IMPORT:messages.auth}}';
{{/if}}
{{#if UPLOADS}}
import type { FileStorage, StoredFile, UploadedFile } from '{{IMPORT:port.fileStorage}}';
{{/if}}
{{#if EVENTS}}
import type { EventBus, EventChannel } from '{{IMPORT:port.eventBus}}';
{{/if}}
import type { HealthCheck } from '{{IMPORT:port.healthCheck}}';
{{#if AUTH_EMAIL}}
import type { Mailer, MailMessage } from '{{IMPORT:port.mailer}}';
{{/if}}
{{#if NOTIFICATIONS}}
import type { PushMessage, PushSender } from '{{IMPORT:port.pushSender}}';
{{/if}}
{{#if REALTIME}}
import type { Realtime } from '{{IMPORT:port.realtime}}';
{{/if}}
{{#if AUTH_OTP}}
import type { SmsSender } from '{{IMPORT:port.smsSender}}';
{{/if}}
{{#if SOCIAL}}
import type { SocialCredential, SocialProfile, SocialVerifier } from '{{IMPORT:port.socialVerifier}}';
{{/if}}

/** Test doubles for the ports: they record what the application sent. */

{{#if CODES}}
/** The last 6-digit code in a list of texts. */
function lastCode(texts: string[], to: string): string {
  const code = texts.toReversed().map(text => /\b(\d{6})\b/.exec(text)?.[1]).find(Boolean);
  if (!code) throw new Error(`No code sent to ${to}`);
  return code;
}
{{/if}}
{{#if AUTH_EMAIL}}

export class FakeMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }

  /** The code in the last email sent to `to`. */
  lastCode(to: string): string {
    return lastCode(this.sent.filter(m => m.to === to).map(m => m.text), to);
  }
}
{{/if}}
{{#if AUTH_OTP}}

export class FakeSms implements SmsSender {
  readonly sent: Array<{ to: string; text: string }> = [];

  async send(to: string, text: string): Promise<void> {
    this.sent.push({ to, text });
  }

  lastCode(to: string): string {
    return lastCode(this.sent.filter(m => m.to === to).map(m => m.text), to);
  }
}
{{/if}}
{{#if SOCIAL}}

/** Accepts tokens shaped `valid:<providerUserId>:<email?>` and rejects everything else. */
export class FakeSocialVerifier implements SocialVerifier {
  async verify(credential: SocialCredential): Promise<SocialProfile> {
    const [kind, id, email] = credential.token.split(':');
    if (kind !== 'valid' || !id) throw new UnauthorizedError(AUTH_MESSAGES.invalidSocialToken('social'));
    // Like Apple: no name in the token – the app sends it.
    return { provider: credential.provider, providerUserId: id, email: email || null, emailVerified: !!email, name: null, avatarUrl: null };
  }
}
{{/if}}
{{#if UPLOADS}}

export class FakeStorage implements FileStorage {
  readonly files = new Map<string, UploadedFile>();

  async save(file: UploadedFile, folder: string): Promise<StoredFile> {
    const key = `${folder}/${randomUUID()}`;
    this.files.set(key, file);
    return { url: `http://localhost:3000/uploads/${key}`, key, fileName: file.originalName, mimeType: file.mimeType, size: file.size };
  }

  async delete(keyOrUrl: string): Promise<void> {
    this.files.delete(keyOrUrl.replace('http://localhost:3000/uploads/', ''));
  }
}
{{/if}}
{{#if NOTIFICATIONS}}

export class FakePushSender implements PushSender {
  readonly sent: Array<{ tokens: string[]; message: PushMessage }> = [];
  /** Tokens to report as invalid on the next send. */
  invalid: string[] = [];

  async send(tokens: string[], message: PushMessage): Promise<{ invalidTokens: string[] }> {
    this.sent.push({ tokens, message });
    return { invalidTokens: tokens.filter(t => this.invalid.includes(t)) };
  }
}
{{/if}}
{{#if REALTIME}}

export class FakeRealtime implements Realtime {
  readonly events: Array<{ to: string; event: string; payload: unknown }> = [];
  readonly online = new Set<string>();

  toUser(userId: string, event: string, payload: unknown): void {
    this.events.push({ to: `user:${userId}`, event, payload });
  }

  toConversation(conversationId: string, event: string, payload: unknown): void {
    this.events.push({ to: `conversation:${conversationId}`, event, payload });
  }

  isOnline(userId: string): boolean {
    return this.online.has(userId);
  }

  eventsFor(userId: string, event: string): unknown[] {
    return this.events.filter(e => e.to === `user:${userId}` && e.event === event).map(e => e.payload);
  }
}
{{/if}}

{{#if EVENTS}}
/** In-process pub/sub: `published` records everything; subscribers are called like Redis would. */
export class FakeEventBus implements EventBus {
  readonly published: Array<{ channel: EventChannel; payload: unknown }> = [];
  private readonly handlers = new Map<EventChannel, Array<(payload: unknown) => Promise<void> | void>>();
  readonly healthCheck = { name: 'events', check: async () => undefined };

  async publish(channel: EventChannel, payload: unknown): Promise<void> {
    // Through JSON, like the real bus (dates become strings).
    const copy: unknown = JSON.parse(JSON.stringify(payload));
    this.published.push({ channel, payload: copy });
    for (const handler of this.handlers.get(channel) ?? []) await handler(copy);
  }

  async subscribe(channel: EventChannel, handler: (payload: unknown) => Promise<void> | void): Promise<void> {
    this.handlers.set(channel, [...(this.handlers.get(channel) ?? []), handler]);
  }

  async close(): Promise<void> {}
}

{{/if}}
export class FakeHealthCheck implements HealthCheck {
  readonly name = 'database';
  healthy = true;

  async check(): Promise<void> {
    if (!this.healthy) throw new Error('down');
  }
}
{{#if GATEWAY}}

/**
 * Stands in for {{GATEWAY_NAME}}: orders are recorded, `nextStatus` decides what confirm answers, and a
 * webhook is "signed" when its `x-fake-signature` header is `valid` (its body is the mapped event).
 */
export class FakePaymentGateway implements PaymentGateway {
  readonly name = '{{GATEWAY_ID}}' as const;
  readonly orders: CreateOrderInput[] = [];
  readonly refunds: Array<{ providerPaymentId: string; amount: number }> = [];
  nextStatus: GatewayConfirmation['status'] = 'paid';

  async createOrder(input: CreateOrderInput): Promise<GatewayOrder> {
    this.orders.push(input);
    const providerOrderId = `order_${this.orders.length}`;
    return { providerOrderId, client: { orderId: providerOrderId } };
  }

  async confirm(providerOrderId: string): Promise<GatewayConfirmation> {
    return { status: this.nextStatus, providerPaymentId: this.nextStatus === 'pending' ? null : `pay_${providerOrderId}`, failureReason: this.nextStatus === 'failed' ? 'Card declined' : undefined };
  }

  async refund(input: { providerPaymentId: string; amount: number }): Promise<{ refundId: string }> {
    this.refunds.push({ providerPaymentId: input.providerPaymentId, amount: input.amount });
    return { refundId: `refund_${this.refunds.length}` };
  }

  async parseWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): Promise<GatewayWebhookEvent> {
    if (headers['x-fake-signature'] !== 'valid') throw new BadRequestError(PAYMENTS_MESSAGES.invalidWebhook);
    return JSON.parse(rawBody.toString('utf8')) as GatewayWebhookEvent;
  }
}
{{/if}}
{{#if IAP_NATIVE}}

/** Stands in for Apple / Google: `purchases` maps a transaction id / purchase token to what the store says. */
export class FakeStorePurchaseVerifier implements StorePurchaseVerifier {
  readonly purchases = new Map<string, VerifiedPurchase>();

  async verify(input: StorePurchaseInput): Promise<VerifiedPurchase> {
    const purchase = this.purchases.get((input.platform === 'ios' ? input.transactionId : input.purchaseToken) ?? '');
    if (!purchase) throw new NotFoundError(PAYMENTS_MESSAGES.purchaseNotFound);
    return purchase;
  }
}
{{/if}}
{{#if IAP_ADAPTY}}

/** Stands in for Adapty: `levels` per customer user id; webhooks need `Authorization: adapty-token`. */
export class FakeAdaptyClient implements AdaptyClient {
  readonly levels = new Map<string, AdaptyAccessLevel[]>();

  async accessLevels(customerUserId: string): Promise<AdaptyAccessLevel[]> {
    return this.levels.get(customerUserId) ?? [];
  }

  isValidWebhook(authorization: string | undefined): boolean {
    return authorization === 'adapty-token';
  }
}
{{/if}}
