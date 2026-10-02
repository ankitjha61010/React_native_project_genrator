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
import type { PrismaClient } from '{{IMPORT:db.connection}}';

type ProductRecord = NonNullable<Awaited<ReturnType<PrismaClient['paymentProduct']['findUnique']>>>;
type EntitlementRecord = NonNullable<Awaited<ReturnType<PrismaClient['entitlement']['findUnique']>>>;
{{#if GATEWAY}}
type PaymentRecord = NonNullable<Awaited<ReturnType<PrismaClient['payment']['findUnique']>>>;
{{/if}}
{{#if IAP}}
type PurchaseRecord = NonNullable<Awaited<ReturnType<PrismaClient['storePurchase']['findUnique']>>>;
{{/if}}

const toProduct = (r: ProductRecord): Product => ({ ...r, kind: r.kind as ProductKind });
const toEntitlement = (r: EntitlementRecord): Entitlement => ({ ...r, source: r.source as EntitlementSource });
{{#if GATEWAY}}
const toPayment = (r: PaymentRecord): Payment => ({ ...r, provider: r.provider as PaymentProvider, status: r.status as PaymentStatus });
{{/if}}
{{#if IAP}}
const toPurchase = (r: PurchaseRecord): Purchase => ({ ...r, store: r.store as PurchaseStore, status: r.status as PurchaseStatus });
{{/if}}

/** Not revoked and not expired at `now`. */
const activeAt = (now: Date) => ({ revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });

export class PrismaPaymentsRepository implements PaymentsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ── catalog ────────────────────────────────────────────────────────────────

  async listProducts(filter: { activeOnly: boolean }): Promise<Product[]> {
    const records = await this.prisma.paymentProduct.findMany({ where: filter.activeOnly ? { active: true } : {}, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    return records.map(toProduct);
  }

  async findProduct(id: string): Promise<Product | null> {
    const record = await this.prisma.paymentProduct.findUnique({ where: { id } });
    return record ? toProduct(record) : null;
  }
{{#if IAP}}

  async findProductByStoreId(storeProductId: string): Promise<Product | null> {
    const record = await this.prisma.paymentProduct.findFirst({ where: { OR: [{ appleProductId: storeProductId }, { googleProductId: storeProductId }] } });
    return record ? toProduct(record) : null;
  }
{{/if}}

  async createProduct(data: ProductInput): Promise<Product> {
    return toProduct(await this.prisma.paymentProduct.create({ data }));
  }

  async updateProduct(id: string, data: Partial<ProductInput>): Promise<Product | null> {
    if ((await this.prisma.paymentProduct.updateMany({ where: { id }, data })).count === 0) return null;
    return this.findProduct(id);
  }

  async deleteProduct(id: string): Promise<boolean> {
    return (await this.prisma.paymentProduct.deleteMany({ where: { id } })).count > 0;
  }

  // ── entitlements ───────────────────────────────────────────────────────────

  async listEntitlements(filter: { userId?: string }, query: PageQuery): Promise<Page<Entitlement>> {
    const where = filter.userId ? { userId: filter.userId } : {};
    const [records, total] = await this.prisma.$transaction([
      this.prisma.entitlement.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pageOffset(query), take: query.limit }),
      this.prisma.entitlement.count({ where }),
    ]);
    return { items: records.map(toEntitlement), total };
  }

  async activeEntitlements(userId: string, now: Date): Promise<Entitlement[]> {
    const records = await this.prisma.entitlement.findMany({ where: { userId, ...activeAt(now) }, orderBy: { createdAt: 'asc' } });
    return records.map(toEntitlement);
  }

  async findEntitlement(id: string): Promise<Entitlement | null> {
    const record = await this.prisma.entitlement.findUnique({ where: { id } });
    return record ? toEntitlement(record) : null;
  }

  async findEntitlementByReference(userId: string, source: EntitlementSource, referenceId: string): Promise<Entitlement | null> {
    const record = await this.prisma.entitlement.findFirst({ where: { userId, source, referenceId }, orderBy: { createdAt: 'desc' } });
    return record ? toEntitlement(record) : null;
  }

  async createEntitlement(data: EntitlementInput): Promise<Entitlement> {
    return toEntitlement(await this.prisma.entitlement.create({ data }));
  }

  async updateEntitlement(id: string, data: Partial<Pick<Entitlement, 'expiresAt' | 'revokedAt' | 'productId'>>): Promise<Entitlement | null> {
    if ((await this.prisma.entitlement.updateMany({ where: { id }, data })).count === 0) return null;
    return this.findEntitlement(id);
  }
{{#if GATEWAY}}

  // ── gateway payments ───────────────────────────────────────────────────────

  async createPayment(data: PaymentInput): Promise<Payment> {
    return toPayment(await this.prisma.payment.create({ data }));
  }

  async findPayment(id: string): Promise<Payment | null> {
    const record = await this.prisma.payment.findUnique({ where: { id } });
    return record ? toPayment(record) : null;
  }

  async findPaymentByProviderOrder(provider: PaymentProvider, providerOrderId: string): Promise<Payment | null> {
    const record = await this.prisma.payment.findUnique({ where: { provider_providerOrderId: { provider, providerOrderId } } });
    return record ? toPayment(record) : null;
  }

  async findPaymentByProviderPayment(provider: PaymentProvider, providerPaymentId: string): Promise<Payment | null> {
    const record = await this.prisma.payment.findFirst({ where: { provider, providerPaymentId } });
    return record ? toPayment(record) : null;
  }

  async transitionPayment(id: string, from: PaymentStatus[], data: Partial<PaymentInput>): Promise<Payment | null> {
    // One conditional UPDATE: only the first caller moves it.
    if ((await this.prisma.payment.updateMany({ where: { id, status: { in: from } }, data })).count === 0) return null;
    return this.findPayment(id);
  }

  async listPayments(filter: { userId?: string; status?: PaymentStatus }, query: PageQuery): Promise<Page<Payment>> {
    const where = { ...(filter.userId ? { userId: filter.userId } : {}), ...(filter.status ? { status: filter.status } : {}) };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pageOffset(query), take: query.limit }),
      this.prisma.payment.count({ where }),
    ]);
    return { items: records.map(toPayment), total };
  }
{{/if}}
{{#if IAP}}

  // ── store purchases ────────────────────────────────────────────────────────

  async findPurchase(store: PurchaseStore, transactionId: string): Promise<Purchase | null> {
    const record = await this.prisma.storePurchase.findUnique({ where: { store_transactionId: { store, transactionId } } });
    return record ? toPurchase(record) : null;
  }

  async upsertPurchase(data: PurchaseInput): Promise<Purchase> {
    const { store, transactionId } = data;
    return toPurchase(await this.prisma.storePurchase.upsert({ where: { store_transactionId: { store, transactionId } }, create: data, update: data }));
  }

  async listPurchases(filter: { userId?: string }, query: PageQuery): Promise<Page<Purchase>> {
    const where = filter.userId ? { userId: filter.userId } : {};
    const [records, total] = await this.prisma.$transaction([
      this.prisma.storePurchase.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pageOffset(query), take: query.limit }),
      this.prisma.storePurchase.count({ where }),
    ]);
    return { items: records.map(toPurchase), total };
  }
{{/if}}

  async stats(now: Date): Promise<PaymentStats> {
{{#if GATEWAY}}
    const settled: PaymentStatus[] = ['paid', 'partially_refunded', 'refunded'];
    const [activeEntitlements, products, paidPayments, revenue{{#if IAP}}, purchases{{/if}}] = await Promise.all([
{{else}}
    const [activeEntitlements, products{{#if IAP}}, purchases{{/if}}] = await Promise.all([
{{/if}}
      this.prisma.entitlement.count({ where: activeAt(now) }),
      this.prisma.paymentProduct.count(),
{{#if GATEWAY}}
      this.prisma.payment.count({ where: { status: { in: settled } } }),
      this.prisma.payment.groupBy({ by: ['currency'], where: { status: { in: settled } }, _sum: { amount: true, refundedAmount: true }, orderBy: { currency: 'asc' } }),
{{/if}}
{{#if IAP}}
      this.prisma.storePurchase.count(),
{{/if}}
    ]);
    return {
      activeEntitlements,
      products,
{{#if GATEWAY}}
      paidPayments,
      revenue: revenue.map(r => ({ currency: r.currency, amount: (r._sum.amount ?? 0) - (r._sum.refundedAmount ?? 0) })),
{{/if}}
{{#if IAP}}
      purchases,
{{/if}}
    };
  }
}
