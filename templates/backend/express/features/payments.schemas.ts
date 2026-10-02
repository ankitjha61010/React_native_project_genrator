import { z } from 'zod';
import { PRODUCT_KINDS{{#if GATEWAY}}, PAYMENT_STATUSES{{/if}} } from '{{IMPORT:domain.payments}}';
import { pageQuery } from '{{IMPORT:ex.schemas}}';

const storeId = z.string().trim().min(1).max(200).nullable();

/** The product fields without defaults – PATCH must only change what is sent. */
const productFields = {
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable(),
  kind: z.enum(PRODUCT_KINDS),
  price: z.number().int().min(0).meta({ description: 'Minor units – 999 = 9.99' }),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, 'ISO 4217 code, e.g. USD')
    .transform(value => value.toUpperCase()),
  accessLevel: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]{1,64}$/, 'lower case letters, digits, _ and -'),
  durationDays: z.number().int().positive().max(36500).nullable().meta({ description: 'Access lasts this many days; null = forever' }),
  appleProductId: storeId,
  googleProductId: storeId,
  active: z.boolean(),
  sortOrder: z.number().int(),
};

export const productSchema = z
  .object({
    ...productFields,
    description: productFields.description.default(null),
    kind: productFields.kind.default('one_time'),
    accessLevel: productFields.accessLevel.default('premium'),
    durationDays: productFields.durationDays.default(null),
    appleProductId: storeId.default(null),
    googleProductId: storeId.default(null),
    active: productFields.active.default(true),
    sortOrder: productFields.sortOrder.default(0),
  })
  .meta({ id: 'ProductRequest' });

export const updateProductSchema = z.object(productFields).partial().meta({ id: 'UpdateProductRequest' });

export const productsQuery = z.object({ all: z.enum(['true', 'false']).optional() });

export const entitlementsQuery = pageQuery.extend({ userId: z.string().min(1).max(64).optional() });

export const grantEntitlementSchema = z
  .object({
    userId: z.string().min(1).max(64),
    accessLevel: z.string().trim().regex(/^[a-z0-9_-]{1,64}$/).default('premium'),
    expiresAt: z.iso.datetime().transform(value => new Date(value)).nullable().default(null),
    productId: z.string().min(1).max(64).nullable().default(null),
  })
  .meta({ id: 'GrantEntitlementRequest' });
{{#if GATEWAY}}

export const checkoutSchema = z.object({ productId: z.string().min(1).max(64) }).meta({ id: 'CheckoutRequest' });

/** Provider specific values from the app's checkout (e.g. Razorpay's payment id + signature). */
export const confirmSchema = z.record(z.string().max(64), z.string().max(2048)).default({}).meta({ id: 'ConfirmPaymentRequest' });

export const paymentsQuery = pageQuery.extend({ status: z.enum(PAYMENT_STATUSES).optional(), userId: z.string().min(1).max(64).optional() });

export const refundSchema = z
  .object({ amount: z.number().int().positive().optional().meta({ description: 'Minor units; empty = everything left' }) })
  .default({})
  .meta({ id: 'RefundRequest' });
{{/if}}
{{#if IAP}}

export const purchasesQuery = pageQuery.extend({ userId: z.string().min(1).max(64).optional() });
{{/if}}
{{#if IAP_NATIVE}}

export const verifyPurchaseSchema = z
  .object({
    platform: z.enum(['ios', 'android']),
    productId: z.string().min(1).max(200),
    transactionId: z.string().min(1).max(255).optional(),
    purchaseToken: z.string().min(1).max(4096).optional(),
    type: z.enum(['in-app', 'subs']).optional(),
  })
  .refine(value => (value.platform === 'ios' ? Boolean(value.transactionId) : Boolean(value.purchaseToken)), {
    message: 'iOS needs transactionId, Android needs purchaseToken',
  })
  .meta({ id: 'VerifyPurchaseRequest' });
{{/if}}
