import { pageOffset, type PageQuery } from '{{IMPORT:core.pagination}}';
import type {
  Entitlement,
  EntitlementInput,
  EntitlementSource,
{{#if GATEWAY}}
  Payment,
  PaymentInput,
  PaymentProvider,
  PaymentStatus,
{{/if}}
  PaymentStats,
  Product,
  ProductInput,
  ProductKind,
{{#if IAP}}
  Purchase,
  PurchaseInput,
  PurchaseStatus,
  PurchaseStore,
{{/if}}
} from '{{IMPORT:domain.payments}}';
import type { Page, PaymentsRepository } from '{{IMPORT:contract.payments}}';
import { isValidId } from '{{IMPORT:db.connection}}';
import {
  EntitlementModel,
  ProductModel,
  type EntitlementDocument,
  type ProductDocument,
{{#if GATEWAY}}
  PaymentModel,
  type PaymentDocument,
{{/if}}
{{#if IAP}}
  PurchaseModel,
  type PurchaseDocument,
{{/if}}
} from '{{IMPORT:mongoose.payments}}';

const toProduct = (d: ProductDocument): Product => ({
  id: d._id.toString(),
  name: d.name,
  description: d.description ?? null,
  kind: d.kind as ProductKind,
  price: d.price,
  currency: d.currency,
  accessLevel: d.accessLevel,
  durationDays: d.durationDays ?? null,
  appleProductId: d.appleProductId ?? null,
  googleProductId: d.googleProductId ?? null,
  active: d.active,
  sortOrder: d.sortOrder,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

const toEntitlement = (d: EntitlementDocument): Entitlement => ({
  id: d._id.toString(),
  userId: d.userId.toString(),
  accessLevel: d.accessLevel,
  source: d.source as EntitlementSource,
  productId: d.productId?.toString() ?? null,
  referenceId: d.referenceId ?? null,
  expiresAt: d.expiresAt ?? null,
  revokedAt: d.revokedAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});
{{#if GATEWAY}}

const toPayment = (d: PaymentDocument): Payment => ({
  id: d._id.toString(),
  userId: d.userId.toString(),
  productId: d.productId.toString(),
  provider: d.provider as PaymentProvider,
  providerOrderId: d.providerOrderId,
  providerPaymentId: d.providerPaymentId ?? null,
  amount: d.amount,
  currency: d.currency,
  status: d.status as PaymentStatus,
  refundedAmount: d.refundedAmount ?? 0,
  failureReason: d.failureReason ?? null,
  paidAt: d.paidAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});
{{/if}}
{{#if IAP}}

const toPurchase = (d: PurchaseDocument): Purchase => ({
  id: d._id.toString(),
  userId: d.userId.toString(),
  productId: d.productId?.toString() ?? null,
  store: d.store as PurchaseStore,
  storeProductId: d.storeProductId,
  transactionId: d.transactionId,
  originalTransactionId: d.originalTransactionId ?? null,
  status: d.status as PurchaseStatus,
  environment: d.environment ?? null,
  purchasedAt: d.purchasedAt,
  expiresAt: d.expiresAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});
{{/if}}

/** Not revoked and not expired at `now`. */
const activeAt = (now: Date) => ({ revokedAt: null, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] });

export class MongoosePaymentsRepository implements PaymentsRepository {
  // ── catalog ────────────────────────────────────────────────────────────────

  async listProducts(filter: { activeOnly: boolean }): Promise<Product[]> {
    const docs = await ProductModel.find(filter.activeOnly ? { active: true } : {})
      .sort({ sortOrder: 1, name: 1 })
      .lean<ProductDocument[]>();
    return docs.map(toProduct);
  }

  async findProduct(id: string): Promise<Product | null> {
    if (!isValidId(id)) return null;
    const doc = await ProductModel.findById(id).lean<ProductDocument>();
    return doc ? toProduct(doc) : null;
  }
{{#if IAP}}

  async findProductByStoreId(storeProductId: string): Promise<Product | null> {
    const doc = await ProductModel.findOne({ $or: [{ appleProductId: storeProductId }, { googleProductId: storeProductId }] }).lean<ProductDocument>();
    return doc ? toProduct(doc) : null;
  }
{{/if}}

  async createProduct(data: ProductInput): Promise<Product> {
    return toProduct((await ProductModel.create(data)).toObject<ProductDocument>());
  }

  async updateProduct(id: string, data: Partial<ProductInput>): Promise<Product | null> {
    if (!isValidId(id)) return null;
    const doc = await ProductModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean<ProductDocument>();
    return doc ? toProduct(doc) : null;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return isValidId(id) && (await ProductModel.deleteOne({ _id: id })).deletedCount > 0;
  }

  // ── entitlements ───────────────────────────────────────────────────────────

  async listEntitlements(filter: { userId?: string }, query: PageQuery): Promise<Page<Entitlement>> {
    if (filter.userId && !isValidId(filter.userId)) return { items: [], total: 0 };
    const where = filter.userId ? { userId: filter.userId } : {};
    const [docs, total] = await Promise.all([
      EntitlementModel.find(where).sort({ createdAt: -1 }).skip(pageOffset(query)).limit(query.limit).lean<EntitlementDocument[]>(),
      EntitlementModel.countDocuments(where),
    ]);
    return { items: docs.map(toEntitlement), total };
  }

  async activeEntitlements(userId: string, now: Date): Promise<Entitlement[]> {
    if (!isValidId(userId)) return [];
    const docs = await EntitlementModel.find({ userId, ...activeAt(now) })
      .sort({ createdAt: 1 })
      .lean<EntitlementDocument[]>();
    return docs.map(toEntitlement);
  }

  async findEntitlement(id: string): Promise<Entitlement | null> {
    if (!isValidId(id)) return null;
    const doc = await EntitlementModel.findById(id).lean<EntitlementDocument>();
    return doc ? toEntitlement(doc) : null;
  }

  async findEntitlementByReference(userId: string, source: EntitlementSource, referenceId: string): Promise<Entitlement | null> {
    if (!isValidId(userId)) return null;
    const doc = await EntitlementModel.findOne({ userId, source, referenceId }).sort({ createdAt: -1 }).lean<EntitlementDocument>();
    return doc ? toEntitlement(doc) : null;
  }

  async createEntitlement(data: EntitlementInput): Promise<Entitlement> {
    return toEntitlement((await EntitlementModel.create(data)).toObject<EntitlementDocument>());
  }

  async updateEntitlement(id: string, data: Partial<Pick<Entitlement, 'expiresAt' | 'revokedAt' | 'productId'>>): Promise<Entitlement | null> {
    if (!isValidId(id)) return null;
    const doc = await EntitlementModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean<EntitlementDocument>();
    return doc ? toEntitlement(doc) : null;
  }
{{#if GATEWAY}}

  // ── gateway payments ───────────────────────────────────────────────────────

  async createPayment(data: PaymentInput): Promise<Payment> {
    return toPayment((await PaymentModel.create(data)).toObject<PaymentDocument>());
  }

  async findPayment(id: string): Promise<Payment | null> {
    if (!isValidId(id)) return null;
    const doc = await PaymentModel.findById(id).lean<PaymentDocument>();
    return doc ? toPayment(doc) : null;
  }

  async findPaymentByProviderOrder(provider: PaymentProvider, providerOrderId: string): Promise<Payment | null> {
    const doc = await PaymentModel.findOne({ provider, providerOrderId }).lean<PaymentDocument>();
    return doc ? toPayment(doc) : null;
  }

  async findPaymentByProviderPayment(provider: PaymentProvider, providerPaymentId: string): Promise<Payment | null> {
    const doc = await PaymentModel.findOne({ provider, providerPaymentId }).lean<PaymentDocument>();
    return doc ? toPayment(doc) : null;
  }

  async transitionPayment(id: string, from: PaymentStatus[], data: Partial<PaymentInput>): Promise<Payment | null> {
    if (!isValidId(id)) return null;
    // Atomic: the status condition and the update are one operation.
    const doc = await PaymentModel.findOneAndUpdate({ _id: id, status: { $in: from } }, { $set: data }, { new: true }).lean<PaymentDocument>();
    return doc ? toPayment(doc) : null;
  }

  async listPayments(filter: { userId?: string; status?: PaymentStatus }, query: PageQuery): Promise<Page<Payment>> {
    if (filter.userId && !isValidId(filter.userId)) return { items: [], total: 0 };
    const where = { ...(filter.userId ? { userId: filter.userId } : {}), ...(filter.status ? { status: filter.status } : {}) };
    const [docs, total] = await Promise.all([
      PaymentModel.find(where).sort({ createdAt: -1 }).skip(pageOffset(query)).limit(query.limit).lean<PaymentDocument[]>(),
      PaymentModel.countDocuments(where),
    ]);
    return { items: docs.map(toPayment), total };
  }
{{/if}}
{{#if IAP}}

  // ── store purchases ────────────────────────────────────────────────────────

  async findPurchase(store: PurchaseStore, transactionId: string): Promise<Purchase | null> {
    const doc = await PurchaseModel.findOne({ store, transactionId }).lean<PurchaseDocument>();
    return doc ? toPurchase(doc) : null;
  }

  async upsertPurchase(data: PurchaseInput): Promise<Purchase> {
    const doc = await PurchaseModel.findOneAndUpdate({ store: data.store, transactionId: data.transactionId }, { $set: data }, { new: true, upsert: true }).lean<PurchaseDocument>();
    return toPurchase(doc);
  }

  async listPurchases(filter: { userId?: string }, query: PageQuery): Promise<Page<Purchase>> {
    if (filter.userId && !isValidId(filter.userId)) return { items: [], total: 0 };
    const where = filter.userId ? { userId: filter.userId } : {};
    const [docs, total] = await Promise.all([
      PurchaseModel.find(where).sort({ createdAt: -1 }).skip(pageOffset(query)).limit(query.limit).lean<PurchaseDocument[]>(),
      PurchaseModel.countDocuments(where),
    ]);
    return { items: docs.map(toPurchase), total };
  }
{{/if}}

  async stats(now: Date): Promise<PaymentStats> {
{{#if GATEWAY}}
    const settled = { status: { $in: ['paid', 'partially_refunded', 'refunded'] } };
    const [activeEntitlements, products, paidPayments, revenue{{#if IAP}}, purchases{{/if}}] = await Promise.all([
{{else}}
    const [activeEntitlements, products{{#if IAP}}, purchases{{/if}}] = await Promise.all([
{{/if}}
      EntitlementModel.countDocuments(activeAt(now)),
      ProductModel.countDocuments(),
{{#if GATEWAY}}
      PaymentModel.countDocuments(settled),
      PaymentModel.aggregate<{ _id: string; amount: number; refunded: number }>([
        { $match: settled },
        { $group: { _id: '$currency', amount: { $sum: '$amount' }, refunded: { $sum: '$refundedAmount' } } },
        { $sort: { _id: 1 } },
      ]),
{{/if}}
{{#if IAP}}
      PurchaseModel.countDocuments(),
{{/if}}
    ]);
    return {
      activeEntitlements,
      products,
{{#if GATEWAY}}
      paidPayments,
      revenue: revenue.map(r => ({ currency: r._id, amount: r.amount - r.refunded })),
{{/if}}
{{#if IAP}}
      purchases,
{{/if}}
    };
  }
}
