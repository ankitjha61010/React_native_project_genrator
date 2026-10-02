import type { Request, Response } from 'express';
import type { PaymentsService } from '{{IMPORT:app.paymentsService}}';
import { currentUser } from '{{IMPORT:ex.mw.auth}}';
import { sendSuccess } from '{{IMPORT:ex.respond}}';
import { idParams } from '{{IMPORT:ex.schemas}}';
import { parseBody, parseParams, parseQuery } from '{{IMPORT:ex.validation}}';
import {
  entitlementsQuery,
  grantEntitlementSchema,
  productSchema,
  productsQuery,
  updateProductSchema,
{{#if GATEWAY}}
  checkoutSchema,
  confirmSchema,
  paymentsQuery,
  refundSchema,
{{/if}}
{{#if IAP}}
  purchasesQuery,
{{/if}}
{{#if IAP_NATIVE}}
  verifyPurchaseSchema,
{{/if}}
} from '{{IMPORT:ex.payments.schemas}}';
import { PAYMENTS_MESSAGES } from '{{IMPORT:messages.payments}}';

{{#if PAYMENT_WEBHOOKS}}
/** The exact bytes the provider signed (kept by the JSON parser – see security.middleware.ts). */
const rawBody = (req: Request): Buffer => (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));

{{/if}}
{{#if GATEWAY}}
/** Header values as single strings (lower-case names). */
const headersOf = (req: Request): Record<string, string | undefined> =>
  Object.fromEntries(Object.entries(req.headers).map(([name, value]) => [name, Array.isArray(value) ? value.join(',') : value]));
{{/if}}

/** Handles `/payments` requests: the store, checkout, webhooks and the admin screens. */
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // ── app ────────────────────────────────────────────────────────────────────

  /** GET /payments/products – what the app can sell */
  listProducts = async (_req: Request, res: Response) => {
    sendSuccess(res, PAYMENTS_MESSAGES.products, await this.payments.listProducts(true));
  };

  /** GET /payments/me – the signed-in user's access levels */
  access = async (req: Request, res: Response) => {
    sendSuccess(res, PAYMENTS_MESSAGES.myAccess, await this.payments.access(currentUser(req).id));
  };
{{#if GATEWAY}}

  /** POST /payments/checkout – creates a {{GATEWAY_NAME}} order for a product */
  checkout = async (req: Request, res: Response) => {
    const { productId } = parseBody(checkoutSchema, req);
    sendSuccess(res, PAYMENTS_MESSAGES.checkoutCreated, await this.payments.checkout(currentUser(req).id, productId), { status: 201 });
  };

  /** POST /payments/:id/confirm – the app finished the checkout; the provider is asked */
  confirm = async (req: Request, res: Response) => {
    const { id } = parseParams(idParams, req);
    const payment = await this.payments.confirm(currentUser(req).id, id, parseBody(confirmSchema, req));
    sendSuccess(res, payment.status === 'paid' ? PAYMENTS_MESSAGES.paymentConfirmed : PAYMENTS_MESSAGES.paymentPending, payment);
  };

  /** GET /payments/history – the signed-in user's payments */
  history = async (req: Request, res: Response) => {
    const { page, limit } = parseQuery(paymentsQuery, req);
    sendSuccess(res, PAYMENTS_MESSAGES.payments, await this.payments.listPayments({ userId: currentUser(req).id }, { page, limit }));
  };

  /** POST /payments/webhooks/{{GATEWAY_ID}} – signed by {{GATEWAY_NAME}}, no user */
  webhook = async (req: Request, res: Response) => {
    await this.payments.handleWebhook(rawBody(req), headersOf(req));
    sendSuccess(res, PAYMENTS_MESSAGES.webhookReceived);
  };
{{/if}}
{{#if IAP_NATIVE}}

  /** POST /payments/iap/verify – a react-native-iap purchase, checked with Apple / Google */
  verifyPurchase = async (req: Request, res: Response) => {
    sendSuccess(res, PAYMENTS_MESSAGES.purchaseVerified, await this.payments.verifyStorePurchase(currentUser(req).id, parseBody(verifyPurchaseSchema, req)));
  };
{{/if}}
{{#if IAP_ADAPTY}}

  /** POST /payments/adapty/sync – after a purchase / restore in the app */
  syncAdapty = async (req: Request, res: Response) => {
    sendSuccess(res, PAYMENTS_MESSAGES.synced, await this.payments.syncAdapty(currentUser(req).id));
  };

  /** POST /payments/webhooks/adapty – Authorization: ADAPTY_WEBHOOK_TOKEN */
  adaptyWebhook = async (req: Request, res: Response) => {
    const body = JSON.parse(rawBody(req).toString('utf8') || '{}') as { customer_user_id?: string | null; event_type?: string };
    await this.payments.handleAdaptyWebhook(req.get('authorization'), body);
    sendSuccess(res, PAYMENTS_MESSAGES.webhookReceived);
  };
{{/if}}

  // ── admin (payments:manage) ────────────────────────────────────────────────

  /** GET /payments/admin/stats */
  stats = async (_req: Request, res: Response) => {
    sendSuccess(res, PAYMENTS_MESSAGES.stats, await this.payments.stats());
  };

  /** GET /payments/admin/products?all=true – inactive ones too */
  adminProducts = async (req: Request, res: Response) => {
    const { all } = parseQuery(productsQuery, req);
    sendSuccess(res, PAYMENTS_MESSAGES.products, await this.payments.listProducts(all !== 'true'));
  };

  /** POST /payments/admin/products */
  createProduct = async (req: Request, res: Response) => {
    sendSuccess(res, PAYMENTS_MESSAGES.productCreated, await this.payments.createProduct(parseBody(productSchema, req)), { status: 201 });
  };

  /** PATCH /payments/admin/products/:id */
  updateProduct = async (req: Request, res: Response) => {
    const { id } = parseParams(idParams, req);
    sendSuccess(res, PAYMENTS_MESSAGES.productUpdated, await this.payments.updateProduct(id, parseBody(updateProductSchema, req)));
  };

  /** DELETE /payments/admin/products/:id */
  deleteProduct = async (req: Request, res: Response) => {
    const { id } = parseParams(idParams, req);
    await this.payments.deleteProduct(id);
    sendSuccess(res, PAYMENTS_MESSAGES.productDeleted);
  };

  /** GET /payments/admin/entitlements?userId= */
  entitlements = async (req: Request, res: Response) => {
    const { userId, page, limit } = parseQuery(entitlementsQuery, req);
    sendSuccess(res, PAYMENTS_MESSAGES.entitlements, await this.payments.listEntitlements({ userId }, { page, limit }));
  };

  /** POST /payments/admin/entitlements – give someone access by hand */
  grant = async (req: Request, res: Response) => {
    sendSuccess(res, PAYMENTS_MESSAGES.entitlementGranted, await this.payments.grantEntitlement(parseBody(grantEntitlementSchema, req)), { status: 201 });
  };

  /** DELETE /payments/admin/entitlements/:id */
  revoke = async (req: Request, res: Response) => {
    const { id } = parseParams(idParams, req);
    sendSuccess(res, PAYMENTS_MESSAGES.entitlementRevoked, await this.payments.revokeEntitlement(id));
  };
{{#if GATEWAY}}

  /** GET /payments/admin/payments?status=&userId= */
  adminPayments = async (req: Request, res: Response) => {
    const { status, userId, page, limit } = parseQuery(paymentsQuery, req);
    sendSuccess(res, PAYMENTS_MESSAGES.payments, await this.payments.listPayments({ status, userId }, { page, limit }));
  };

  /** POST /payments/admin/payments/:id/refund – all, or `amount` (minor units) */
  refund = async (req: Request, res: Response) => {
    const { id } = parseParams(idParams, req);
    const { amount } = parseBody(refundSchema, req);
    sendSuccess(res, PAYMENTS_MESSAGES.refunded, await this.payments.refund(id, amount));
  };
{{/if}}
{{#if IAP}}

  /** GET /payments/admin/purchases?userId= */
  purchases = async (req: Request, res: Response) => {
    const { userId, page, limit } = parseQuery(purchasesQuery, req);
    sendSuccess(res, PAYMENTS_MESSAGES.purchases, await this.payments.listPurchases({ userId }, { page, limit }));
  };
{{/if}}
}
