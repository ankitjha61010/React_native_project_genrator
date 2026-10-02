import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TIMESTAMP, UuidColumn } from '{{IMPORT:typeorm.columns}}';

// No foreign keys to users on purpose: payment records stay when an account is deleted (accounting).

@Entity({ name: 'payment_products' })
export class PaymentProductOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 16 })
  kind: string;

  /** Minor units (999 = 9.99). */
  @Column({ type: 'int' })
  price: number;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ name: 'access_level', type: 'varchar', length: 64 })
  accessLevel: string;

  @Column({ name: 'duration_days', type: 'int', nullable: true })
  durationDays: number | null;

  @Index('UQ_payment_products_apple_product_id', { unique: true })
  @Column({ name: 'apple_product_id', type: 'varchar', length: 200, nullable: true })
  appleProductId: string | null;

  @Index('UQ_payment_products_google_product_id', { unique: true })
  @Column({ name: 'google_product_id', type: 'varchar', length: 200, nullable: true })
  googleProductId: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: TIMESTAMP })
  updatedAt: Date;
}

@Entity({ name: 'entitlements' })
@Index('IDX_entitlements_user_source_reference', ['userId', 'source', 'referenceId'])
export class EntitlementOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @UuidColumn({ name: 'user_id' })
  userId: string;

  @Column({ name: 'access_level', type: 'varchar', length: 64 })
  accessLevel: string;

  @Column({ type: 'varchar', length: 16 })
  source: string;

  @UuidColumn({ name: 'product_id', nullable: true })
  productId: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 255, nullable: true })
  referenceId: string | null;

  @Column({ name: 'expires_at', type: TIMESTAMP, nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'revoked_at', type: TIMESTAMP, nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: TIMESTAMP })
  updatedAt: Date;
}
{{#if GATEWAY}}

@Entity({ name: 'payments' })
@Index('UQ_payments_provider_order', ['provider', 'providerOrderId'], { unique: true })
@Index('IDX_payments_provider_payment', ['provider', 'providerPaymentId'])
@Index('IDX_payments_user_created', ['userId', 'createdAt'])
@Index('IDX_payments_status_created', ['status', 'createdAt'])
export class PaymentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @UuidColumn({ name: 'user_id' })
  userId: string;

  @UuidColumn({ name: 'product_id' })
  productId: string;

  @Column({ type: 'varchar', length: 16 })
  provider: string;

  @Column({ name: 'provider_order_id', type: 'varchar', length: 255 })
  providerOrderId: string;

  @Column({ name: 'provider_payment_id', type: 'varchar', length: 255, nullable: true })
  providerPaymentId: string | null;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 24 })
  status: string;

  @Column({ name: 'refunded_amount', type: 'int', default: 0 })
  refundedAmount: number;

  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason: string | null;

  @Column({ name: 'paid_at', type: TIMESTAMP, nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: TIMESTAMP })
  updatedAt: Date;
}
{{/if}}
{{#if IAP}}

@Entity({ name: 'store_purchases' })
@Index('UQ_store_purchases_store_transaction', ['store', 'transactionId'], { unique: true })
@Index('IDX_store_purchases_user_created', ['userId', 'createdAt'])
export class StorePurchaseOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @UuidColumn({ name: 'user_id' })
  userId: string;

  @UuidColumn({ name: 'product_id', nullable: true })
  productId: string | null;

  @Column({ type: 'varchar', length: 16 })
  store: string;

  @Column({ name: 'store_product_id', type: 'varchar', length: 200 })
  storeProductId: string;

  @Column({ name: 'transaction_id', type: 'varchar', length: 255 })
  transactionId: string;

  @Column({ name: 'original_transaction_id', type: 'varchar', length: 1024, nullable: true })
  originalTransactionId: string | null;

  @Column({ type: 'varchar', length: 16 })
  status: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  environment: string | null;

  @Column({ name: 'purchased_at', type: TIMESTAMP })
  purchasedAt: Date;

  @Column({ name: 'expires_at', type: TIMESTAMP, nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: TIMESTAMP })
  updatedAt: Date;
}
{{/if}}
