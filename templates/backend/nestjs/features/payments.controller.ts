import { Body, Controller, Delete, Get, {{#if IAP_ADAPTY}}Headers, {{/if}}Param, Patch, Post, Query{{#if PAYMENT_WEBHOOKS}}, Req, type RawBodyRequest{{/if}} } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiTags } from '@nestjs/swagger';
{{/if}}
{{#if PAYMENT_WEBHOOKS}}
import type { Request } from 'express';
{{/if}}
import { PaymentsService } from '{{IMPORT:app.paymentsService}}';
import type { User } from '{{IMPORT:domain.user}}';
import { CurrentUser, {{#if PAYMENT_WEBHOOKS}}Public, {{/if}}RequirePermissions } from '{{IMPORT:nest.decorators}}';
import { Endpoint } from '{{IMPORT:nest.endpoint}}';
import {
  EntitlementsQueryDto,
  GrantEntitlementDto,
  ProductDto,
  ProductsQueryDto,
  UpdateProductDto,
{{#if GATEWAY}}
  CheckoutDto,
  PaymentsQueryDto,
  RefundDto,
{{/if}}
{{#if IAP}}
  PurchasesQueryDto,
{{/if}}
{{#if IAP_NATIVE}}
  VerifyPurchaseDto,
{{/if}}
} from '{{IMPORT:nest.payments.dto}}';
import { PAYMENTS_MESSAGES } from '{{IMPORT:messages.payments}}';

{{#if PAYMENT_WEBHOOKS}}
/** The exact bytes the provider signed (main.ts creates the app with `rawBody: true`). */
const rawBody = (req: RawBodyRequest<Request>): Buffer => req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));

{{/if}}
{{#if GATEWAY}}
/** Header values as single strings (lower-case names). */
const headersOf = (req: Request): Record<string, string | undefined> =>
  Object.fromEntries(Object.entries(req.headers).map(([name, value]) => [name, Array.isArray(value) ? value.join(',') : value]));
{{/if}}

/** `/payments` – the store (app), provider webhooks (public, signed) and the admin screens. */
{{#if SWAGGER}}
@ApiTags('Payments')
{{/if}}
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // ── webhooks (no user – the provider's signature / token is checked) ────────
{{#if GATEWAY}}

  @Public()
  @Post('webhooks/{{GATEWAY_ID}}')
  @Endpoint({ summary: '{{GATEWAY_NAME}} webhook (signature checked)', message: PAYMENTS_MESSAGES.webhookReceived, status: 200, errors: [400, 503] })
  async webhook(@Req() req: RawBodyRequest<Request>) {
    await this.payments.handleWebhook(rawBody(req), headersOf(req));
  }
{{/if}}
{{#if IAP_ADAPTY}}

  @Public()
  @Post('webhooks/adapty')
  @Endpoint({ summary: 'Adapty webhook (Authorization: ADAPTY_WEBHOOK_TOKEN)', message: PAYMENTS_MESSAGES.webhookReceived, status: 200, errors: [401] })
  async adaptyWebhook(@Req() req: RawBodyRequest<Request>, @Headers('authorization') authorization?: string) {
    const body = JSON.parse(rawBody(req).toString('utf8') || '{}') as { customer_user_id?: string | null; event_type?: string };
    await this.payments.handleAdaptyWebhook(authorization, body);
  }
{{/if}}

  // ── app ────────────────────────────────────────────────────────────────────

  @Get('products')
  @Endpoint({ summary: 'Products the app can sell', message: PAYMENTS_MESSAGES.products, errors: [401], bearer: true })
  products() {
    return this.payments.listProducts(true);
  }

  @Get('me')
  @Endpoint({ summary: "The signed-in user's access levels", message: PAYMENTS_MESSAGES.myAccess, errors: [401], bearer: true })
  access(@CurrentUser() user: User) {
    return this.payments.access(user.id);
  }
{{#if GATEWAY}}

  @Post('checkout')
  @Endpoint({ summary: 'Create a {{GATEWAY_NAME}} order for a product', message: PAYMENTS_MESSAGES.checkoutCreated, status: 201, errors: [400, 401, 404, 502, 503], bearer: true })
  checkout(@CurrentUser() user: User, @Body() dto: CheckoutDto) {
    return this.payments.checkout(user.id, dto.productId);
  }

  @Get('history')
  @Endpoint({ summary: "The signed-in user's payments", message: PAYMENTS_MESSAGES.payments, paginated: true, errors: [401], bearer: true })
  history(@CurrentUser() user: User, @Query() query: PaymentsQueryDto) {
    return this.payments.listPayments({ userId: user.id }, { page: query.page, limit: query.limit });
  }

  @Post(':id/confirm')
  @Endpoint({ summary: 'The app finished the checkout – ask the provider', message: PAYMENTS_MESSAGES.paymentConfirmed, status: 200, errors: [400, 401, 404, 502], bearer: true })
  confirm(@CurrentUser() user: User, @Param('id') id: string, @Body() body: Record<string, string> = {}) {
    return this.payments.confirm(user.id, id, body ?? {});
  }
{{/if}}
{{#if IAP_NATIVE}}

  @Post('iap/verify')
  @Endpoint({ summary: 'Verify a react-native-iap purchase with Apple / Google', message: PAYMENTS_MESSAGES.purchaseVerified, status: 200, errors: [400, 401, 404, 409, 502, 503], bearer: true })
  verify(@CurrentUser() user: User, @Body() dto: VerifyPurchaseDto) {
    return this.payments.verifyStorePurchase(user.id, dto);
  }
{{/if}}
{{#if IAP_ADAPTY}}

  @Post('adapty/sync')
  @Endpoint({ summary: 'Sync access levels from Adapty (after a purchase / restore)', message: PAYMENTS_MESSAGES.synced, status: 200, errors: [401, 502, 503], bearer: true })
  syncAdapty(@CurrentUser() user: User) {
    return this.payments.syncAdapty(user.id);
  }
{{/if}}

  // ── admin (payments:manage) ────────────────────────────────────────────────

  @Get('admin/stats')
  @RequirePermissions('payments:manage')
  @Endpoint({ summary: 'Payment statistics', message: PAYMENTS_MESSAGES.stats, errors: [401, 403], bearer: true })
  stats() {
    return this.payments.stats();
  }

  @Get('admin/products')
  @RequirePermissions('payments:manage')
  @Endpoint({ summary: 'All products (?all=true: inactive ones too)', message: PAYMENTS_MESSAGES.products, errors: [401, 403], bearer: true })
  adminProducts(@Query() query: ProductsQueryDto) {
    return this.payments.listProducts(query.all !== 'true');
  }

  @Post('admin/products')
  @RequirePermissions('payments:manage')
  @Endpoint({ summary: 'Create a product', message: PAYMENTS_MESSAGES.productCreated, status: 201, errors: [401, 403, 422], bearer: true })
  createProduct(@Body() dto: ProductDto) {
    return this.payments.createProduct({ ...dto });
  }

  @Patch('admin/products/:id')
  @RequirePermissions('payments:manage')
  @Endpoint({ summary: 'Update a product', message: PAYMENTS_MESSAGES.productUpdated, errors: [401, 403, 404, 422], bearer: true })
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.payments.updateProduct(id, { ...dto });
  }

  @Delete('admin/products/:id')
  @RequirePermissions('payments:manage')
  @Endpoint({ summary: 'Delete a product', message: PAYMENTS_MESSAGES.productDeleted, errors: [401, 403, 404], bearer: true })
  async deleteProduct(@Param('id') id: string) {
    await this.payments.deleteProduct(id);
  }

  @Get('admin/entitlements')
  @RequirePermissions('payments:manage')
  @Endpoint({ summary: 'Entitlements (?userId=)', message: PAYMENTS_MESSAGES.entitlements, paginated: true, errors: [401, 403], bearer: true })
  entitlements(@Query() query: EntitlementsQueryDto) {
    return this.payments.listEntitlements({ userId: query.userId }, { page: query.page, limit: query.limit });
  }

  @Post('admin/entitlements')
  @RequirePermissions('payments:manage')
  @Endpoint({ summary: 'Give someone access by hand', message: PAYMENTS_MESSAGES.entitlementGranted, status: 201, errors: [401, 403, 404, 422], bearer: true })
  grant(@Body() dto: GrantEntitlementDto) {
    return this.payments.grantEntitlement({ userId: dto.userId, accessLevel: dto.accessLevel, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null, productId: dto.productId ?? null });
  }

  @Delete('admin/entitlements/:id')
  @RequirePermissions('payments:manage')
  @Endpoint({ summary: 'Revoke an entitlement', message: PAYMENTS_MESSAGES.entitlementRevoked, errors: [401, 403, 404], bearer: true })
  revoke(@Param('id') id: string) {
    return this.payments.revokeEntitlement(id);
  }
{{#if GATEWAY}}

  @Get('admin/payments')
  @RequirePermissions('payments:manage')
  @Endpoint({ summary: 'Payments (?status=&userId=)', message: PAYMENTS_MESSAGES.payments, paginated: true, errors: [401, 403], bearer: true })
  adminPayments(@Query() query: PaymentsQueryDto) {
    return this.payments.listPayments({ status: query.status, userId: query.userId }, { page: query.page, limit: query.limit });
  }

  @Post('admin/payments/:id/refund')
  @RequirePermissions('payments:manage')
  @Endpoint({ summary: 'Refund all of a payment, or `amount` (minor units)', message: PAYMENTS_MESSAGES.refunded, status: 200, errors: [400, 401, 403, 404, 502], bearer: true })
  refund(@Param('id') id: string, @Body() dto: RefundDto) {
    return this.payments.refund(id, dto.amount);
  }
{{/if}}
{{#if IAP}}

  @Get('admin/purchases')
  @RequirePermissions('payments:manage')
  @Endpoint({ summary: 'Store purchases (?userId=)', message: PAYMENTS_MESSAGES.purchases, paginated: true, errors: [401, 403], bearer: true })
  purchases(@Query() query: PurchasesQueryDto) {
    return this.payments.listPurchases({ userId: query.userId }, { page: query.page, limit: query.limit });
  }
{{/if}}
}
