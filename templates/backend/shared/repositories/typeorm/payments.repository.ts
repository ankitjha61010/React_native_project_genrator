import { {{#if GATEWAY}}In, {{/if}}IsNull, MoreThan, type DataSource, type FindOptionsWhere, type Repository } from 'typeorm';
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
import { EntitlementOrmEntity, PaymentProductOrmEntity{{#if GATEWAY}}, PaymentOrmEntity{{/if}}{{#if IAP}}, StorePurchaseOrmEntity{{/if}} } from '{{IMPORT:typeorm.payments}}';

const toProduct = (e: PaymentProductOrmEntity): Product => ({ ...e, kind: e.kind as ProductKind });
const toEntitlement = (e: EntitlementOrmEntity): Entitlement => ({ ...e, source: e.source as EntitlementSource });
{{#if GATEWAY}}
const toPayment = (e: PaymentOrmEntity): Payment => ({ ...e, provider: e.provider as PaymentProvider, status: e.status as PaymentStatus });
{{/if}}
{{#if IAP}}
const toPurchase = (e: StorePurchaseOrmEntity): Purchase => ({ ...e, store: e.store as PurchaseStore, status: e.status as PurchaseStatus });
{{/if}}

/** Not revoked and not expired at `now` (an OR of two conditions). */
const activeAt = (now: Date, where: FindOptionsWhere<EntitlementOrmEntity> = {}): FindOptionsWhere<EntitlementOrmEntity>[] => [
  { ...where, revokedAt: IsNull(), expiresAt: IsNull() },
  { ...where, revokedAt: IsNull(), expiresAt: MoreThan(now) },
];

export class TypeOrmPaymentsRepository implements PaymentsRepository {
  private readonly products: Repository<PaymentProductOrmEntity>;
  private readonly entitlements: Repository<EntitlementOrmEntity>;
{{#if GATEWAY}}
  private readonly payments: Repository<PaymentOrmEntity>;
{{/if}}
{{#if IAP}}
  private readonly purchases: Repository<StorePurchaseOrmEntity>;
{{/if}}

  constructor(dataSource: DataSource) {
    this.products = dataSource.getRepository(PaymentProductOrmEntity);
    this.entitlements = dataSource.getRepository(EntitlementOrmEntity);
{{#if GATEWAY}}
    this.payments = dataSource.getRepository(PaymentOrmEntity);
{{/if}}
{{#if IAP}}
    this.purchases = dataSource.getRepository(StorePurchaseOrmEntity);
{{/if}}
  }

  // ── catalog ────────────────────────────────────────────────────────────────

  async listProducts(filter: { activeOnly: boolean }): Promise<Product[]> {
    const entities = await this.products.find({ where: filter.activeOnly ? { active: true } : {}, order: { sortOrder: 'ASC', name: 'ASC' } });
    return entities.map(toProduct);
  }

  async findProduct(id: string): Promise<Product | null> {
    const entity = await this.products.findOneBy({ id });
    return entity ? toProduct(entity) : null;
  }
{{#if IAP}}

  async findProductByStoreId(storeProductId: string): Promise<Product | null> {
    const entity = await this.products.findOne({ where: [{ appleProductId: storeProductId }, { googleProductId: storeProductId }] });
    return entity ? toProduct(entity) : null;
  }
{{/if}}

  async createProduct(data: ProductInput): Promise<Product> {
    return toProduct(await this.products.save(this.products.create(data)));
  }

  async updateProduct(id: string, data: Partial<ProductInput>): Promise<Product | null> {
    if (Object.keys(data).length && ((await this.products.update({ id }, data)).affected ?? 0) === 0) return null;
    return this.findProduct(id);
  }

  async deleteProduct(id: string): Promise<boolean> {
    return ((await this.products.delete({ id })).affected ?? 0) > 0;
  }

  // ── entitlements ───────────────────────────────────────────────────────────

  async listEntitlements(filter: { userId?: string }, query: PageQuery): Promise<Page<Entitlement>> {
    const [entities, total] = await this.entitlements.findAndCount({
      where: filter.userId ? { userId: filter.userId } : {},
      order: { createdAt: 'DESC' },
      skip: pageOffset(query),
      take: query.limit,
    });
    return { items: entities.map(toEntitlement), total };
  }

  async activeEntitlements(userId: string, now: Date): Promise<Entitlement[]> {
    const entities = await this.entitlements.find({ where: activeAt(now, { userId }), order: { createdAt: 'ASC' } });
    return entities.map(toEntitlement);
  }

  async findEntitlement(id: string): Promise<Entitlement | null> {
    const entity = await this.entitlements.findOneBy({ id });
    return entity ? toEntitlement(entity) : null;
  }

  async findEntitlementByReference(userId: string, source: EntitlementSource, referenceId: string): Promise<Entitlement | null> {
    const entity = await this.entitlements.findOne({ where: { userId, source, referenceId }, order: { createdAt: 'DESC' } });
    return entity ? toEntitlement(entity) : null;
  }

  async createEntitlement(data: EntitlementInput): Promise<Entitlement> {
    return toEntitlement(await this.entitlements.save(this.entitlements.create({ ...data, revokedAt: null })));
  }

  async updateEntitlement(id: string, data: Partial<Pick<Entitlement, 'expiresAt' | 'revokedAt' | 'productId'>>): Promise<Entitlement | null> {
    if (((await this.entitlements.update({ id }, data)).affected ?? 0) === 0) return null;
    return this.findEntitlement(id);
  }
{{#if GATEWAY}}

  // ── gateway payments ───────────────────────────────────────────────────────

  async createPayment(data: PaymentInput): Promise<Payment> {
    return toPayment(await this.payments.save(this.payments.create(data)));
  }

  async findPayment(id: string): Promise<Payment | null> {
    const entity = await this.payments.findOneBy({ id });
    return entity ? toPayment(entity) : null;
  }

  async findPaymentByProviderOrder(provider: PaymentProvider, providerOrderId: string): Promise<Payment | null> {
    const entity = await this.payments.findOneBy({ provider, providerOrderId });
    return entity ? toPayment(entity) : null;
  }

  async findPaymentByProviderPayment(provider: PaymentProvider, providerPaymentId: string): Promise<Payment | null> {
    const entity = await this.payments.findOneBy({ provider, providerPaymentId });
    return entity ? toPayment(entity) : null;
  }

  async transitionPayment(id: string, from: PaymentStatus[], data: Partial<PaymentInput>): Promise<Payment | null> {
    // One conditional UPDATE: only the first caller moves it.
    if (((await this.payments.update({ id, status: In(from) }, data)).affected ?? 0) === 0) return null;
    return this.findPayment(id);
  }

  async listPayments(filter: { userId?: string; status?: PaymentStatus }, query: PageQuery): Promise<Page<Payment>> {
    const [entities, total] = await this.payments.findAndCount({
      where: { ...(filter.userId ? { userId: filter.userId } : {}), ...(filter.status ? { status: filter.status } : {}) },
      order: { createdAt: 'DESC' },
      skip: pageOffset(query),
      take: query.limit,
    });
    return { items: entities.map(toPayment), total };
  }
{{/if}}
{{#if IAP}}

  // ── store purchases ────────────────────────────────────────────────────────

  async findPurchase(store: PurchaseStore, transactionId: string): Promise<Purchase | null> {
    const entity = await this.purchases.findOneBy({ store, transactionId });
    return entity ? toPurchase(entity) : null;
  }

  async upsertPurchase(data: PurchaseInput): Promise<Purchase> {
    const existing = await this.purchases.findOneBy({ store: data.store, transactionId: data.transactionId });
    return toPurchase(await this.purchases.save(existing ? this.purchases.merge(existing, data) : this.purchases.create(data)));
  }

  async listPurchases(filter: { userId?: string }, query: PageQuery): Promise<Page<Purchase>> {
    const [entities, total] = await this.purchases.findAndCount({
      where: filter.userId ? { userId: filter.userId } : {},
      order: { createdAt: 'DESC' },
      skip: pageOffset(query),
      take: query.limit,
    });
    return { items: entities.map(toPurchase), total };
  }
{{/if}}

  async stats(now: Date): Promise<PaymentStats> {
{{#if GATEWAY}}
    const settled = In(['paid', 'partially_refunded', 'refunded']);
    const [activeEntitlements, products, paidPayments, revenue{{#if IAP}}, purchases{{/if}}] = await Promise.all([
{{else}}
    const [activeEntitlements, products{{#if IAP}}, purchases{{/if}}] = await Promise.all([
{{/if}}
      this.entitlements.count({ where: activeAt(now) }),
      this.products.count(),
{{#if GATEWAY}}
      this.payments.count({ where: { status: settled } }),
      this.payments
        .createQueryBuilder('p')
        .select('p.currency', 'currency')
        .addSelect('SUM(p.amount)', 'amount')
        .addSelect('SUM(p.refunded_amount)', 'refunded')
        .where('p.status IN (:...statuses)', { statuses: ['paid', 'partially_refunded', 'refunded'] })
        .groupBy('p.currency')
        .orderBy('p.currency', 'ASC')
        .getRawMany<{ currency: string; amount: string | number; refunded: string | number }>(),
{{/if}}
{{#if IAP}}
      this.purchases.count(),
{{/if}}
    ]);
    return {
      activeEntitlements,
      products,
{{#if GATEWAY}}
      paidPayments,
      // SUM() comes back as a string from PostgreSQL / MySQL.
      revenue: revenue.map(r => ({ currency: r.currency, amount: Number(r.amount) - Number(r.refunded) })),
{{/if}}
{{#if IAP}}
      purchases,
{{/if}}
    };
  }
}
