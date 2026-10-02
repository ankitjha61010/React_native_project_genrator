import { Schema, model, type Types } from 'mongoose';

// No `ref: 'User'` cascade on purpose: payment records stay when an account is deleted (accounting).

const productSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 120 },
    description: { type: String, default: null, maxlength: 1000 },
    kind: { type: String, required: true, maxlength: 16 },
    /** Minor units (999 = 9.99). */
    price: { type: Number, required: true },
    currency: { type: String, required: true, maxlength: 3 },
    accessLevel: { type: String, required: true, maxlength: 64 },
    durationDays: { type: Number, default: null },
    appleProductId: { type: String, default: null, maxlength: 200 },
    googleProductId: { type: String, default: null, maxlength: 200 },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'payment_products' },
);
// Unique when set (several products may have none).
productSchema.index({ appleProductId: 1 }, { unique: true, partialFilterExpression: { appleProductId: { $type: 'string' } } });
productSchema.index({ googleProductId: 1 }, { unique: true, partialFilterExpression: { googleProductId: { $type: 'string' } } });

export interface ProductDocument {
  _id: Types.ObjectId;
  name: string;
  description: string | null;
  kind: string;
  price: number;
  currency: string;
  accessLevel: string;
  durationDays: number | null;
  appleProductId: string | null;
  googleProductId: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
export const ProductModel = model('PaymentProduct', productSchema);

const entitlementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    accessLevel: { type: String, required: true, maxlength: 64 },
    source: { type: String, required: true, maxlength: 16 },
    productId: { type: Schema.Types.ObjectId, default: null },
    referenceId: { type: String, default: null, maxlength: 255 },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'entitlements' },
);
entitlementSchema.index({ userId: 1, source: 1, referenceId: 1 });

export interface EntitlementDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  accessLevel: string;
  source: string;
  productId: Types.ObjectId | null;
  referenceId: string | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export const EntitlementModel = model('Entitlement', entitlementSchema);
{{#if GATEWAY}}

const paymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, required: true },
    provider: { type: String, required: true, maxlength: 16 },
    providerOrderId: { type: String, required: true, maxlength: 255 },
    providerPaymentId: { type: String, default: null, maxlength: 255 },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, maxlength: 3 },
    status: { type: String, required: true, maxlength: 24 },
    refundedAmount: { type: Number, default: 0 },
    failureReason: { type: String, default: null, maxlength: 500 },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'payments' },
);
paymentSchema.index({ provider: 1, providerOrderId: 1 }, { unique: true });
paymentSchema.index({ provider: 1, providerPaymentId: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

export interface PaymentDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  provider: string;
  providerOrderId: string;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  status: string;
  refundedAmount: number;
  failureReason: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export const PaymentModel = model('Payment', paymentSchema);
{{/if}}
{{#if IAP}}

const purchaseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, default: null },
    store: { type: String, required: true, maxlength: 16 },
    storeProductId: { type: String, required: true, maxlength: 200 },
    transactionId: { type: String, required: true, maxlength: 255 },
    originalTransactionId: { type: String, default: null, maxlength: 1024 },
    status: { type: String, required: true, maxlength: 16 },
    environment: { type: String, default: null, maxlength: 32 },
    purchasedAt: { type: Date, required: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'store_purchases' },
);
purchaseSchema.index({ store: 1, transactionId: 1 }, { unique: true });
purchaseSchema.index({ userId: 1, createdAt: -1 });

export interface PurchaseDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  productId: Types.ObjectId | null;
  store: string;
  storeProductId: string;
  transactionId: string;
  originalTransactionId: string | null;
  status: string;
  environment: string | null;
  purchasedAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export const PurchaseModel = model('StorePurchase', purchaseSchema);
{{/if}}
