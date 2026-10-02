import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Payments module tables (payment.orm-entities.ts) – generated from the entities, after Init. */
export class Payments1767225600100 implements MigrationInterface {
  name = 'Payments1767225600100';

  public async up(queryRunner: QueryRunner): Promise<void> {
{{#if POSTGRES}}
    await queryRunner.query(`CREATE TABLE "payment_products" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(120) NOT NULL, "description" character varying(1000), "kind" character varying(16) NOT NULL, "price" integer NOT NULL, "currency" character(3) NOT NULL, "access_level" character varying(64) NOT NULL, "duration_days" integer, "apple_product_id" character varying(200), "google_product_id" character varying(200), "active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7ffefbbee9d3347df705ce89cf7" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_payment_products_apple_product_id" ON "payment_products"  ("apple_product_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_payment_products_google_product_id" ON "payment_products"  ("google_product_id") `);
    await queryRunner.query(`CREATE TABLE "entitlements" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "access_level" character varying(64) NOT NULL, "source" character varying(16) NOT NULL, "product_id" uuid, "reference_id" character varying(255), "expires_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a45cb6f5747d49365a879bffde" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_entitlements_user_source_reference" ON "entitlements"  ("user_id", "source", "reference_id") `);
{{#if GATEWAY}}
    await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "product_id" uuid NOT NULL, "provider" character varying(16) NOT NULL, "provider_order_id" character varying(255) NOT NULL, "provider_payment_id" character varying(255), "amount" integer NOT NULL, "currency" character(3) NOT NULL, "status" character varying(24) NOT NULL, "refunded_amount" integer NOT NULL DEFAULT '0', "failure_reason" character varying(500), "paid_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
{{/if}}
{{#if GATEWAY}}
    await queryRunner.query(`CREATE INDEX "IDX_payments_status_created" ON "payments"  ("status", "created_at") `);
{{/if}}
{{#if GATEWAY}}
    await queryRunner.query(`CREATE INDEX "IDX_payments_user_created" ON "payments"  ("user_id", "created_at") `);
{{/if}}
{{#if GATEWAY}}
    await queryRunner.query(`CREATE INDEX "IDX_payments_provider_payment" ON "payments"  ("provider", "provider_payment_id") `);
{{/if}}
{{#if GATEWAY}}
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_payments_provider_order" ON "payments"  ("provider", "provider_order_id") `);
{{/if}}
{{#if IAP}}
    await queryRunner.query(`CREATE TABLE "store_purchases" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "product_id" uuid, "store" character varying(16) NOT NULL, "store_product_id" character varying(200) NOT NULL, "transaction_id" character varying(255) NOT NULL, "original_transaction_id" character varying(1024), "status" character varying(16) NOT NULL, "environment" character varying(32), "purchased_at" TIMESTAMP WITH TIME ZONE NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4f5cb8b555068d34f37f7e95445" PRIMARY KEY ("id"))`);
{{/if}}
{{#if IAP}}
    await queryRunner.query(`CREATE INDEX "IDX_store_purchases_user_created" ON "store_purchases"  ("user_id", "created_at") `);
{{/if}}
{{#if IAP}}
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_store_purchases_store_transaction" ON "store_purchases"  ("store", "transaction_id") `);
{{/if}}
{{/if}}
{{#if MYSQL}}
    await queryRunner.query(`CREATE TABLE \`payment_products\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(120) NOT NULL, \`description\` varchar(1000) NULL, \`kind\` varchar(16) NOT NULL, \`price\` int NOT NULL, \`currency\` char(3) NOT NULL, \`access_level\` varchar(64) NOT NULL, \`duration_days\` int NULL, \`apple_product_id\` varchar(200) NULL, \`google_product_id\` varchar(200) NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`sort_order\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_payment_products_apple_product_id\` (\`apple_product_id\`), UNIQUE INDEX \`UQ_payment_products_google_product_id\` (\`google_product_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`entitlements\` (\`id\` varchar(36) NOT NULL, \`user_id\` char(36) NOT NULL, \`access_level\` varchar(64) NOT NULL, \`source\` varchar(16) NOT NULL, \`product_id\` char(36) NULL, \`reference_id\` varchar(255) NULL, \`expires_at\` datetime NULL, \`revoked_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_entitlements_user_source_reference\` (\`user_id\`, \`source\`, \`reference_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
{{#if GATEWAY}}
    await queryRunner.query(`CREATE TABLE \`payments\` (\`id\` varchar(36) NOT NULL, \`user_id\` char(36) NOT NULL, \`product_id\` char(36) NOT NULL, \`provider\` varchar(16) NOT NULL, \`provider_order_id\` varchar(255) NOT NULL, \`provider_payment_id\` varchar(255) NULL, \`amount\` int NOT NULL, \`currency\` char(3) NOT NULL, \`status\` varchar(24) NOT NULL, \`refunded_amount\` int NOT NULL DEFAULT '0', \`failure_reason\` varchar(500) NULL, \`paid_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_payments_status_created\` (\`status\`, \`created_at\`), INDEX \`IDX_payments_user_created\` (\`user_id\`, \`created_at\`), INDEX \`IDX_payments_provider_payment\` (\`provider\`, \`provider_payment_id\`), UNIQUE INDEX \`UQ_payments_provider_order\` (\`provider\`, \`provider_order_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
{{/if}}
{{#if IAP}}
    await queryRunner.query(`CREATE TABLE \`store_purchases\` (\`id\` varchar(36) NOT NULL, \`user_id\` char(36) NOT NULL, \`product_id\` char(36) NULL, \`store\` varchar(16) NOT NULL, \`store_product_id\` varchar(200) NOT NULL, \`transaction_id\` varchar(255) NOT NULL, \`original_transaction_id\` varchar(1024) NULL, \`status\` varchar(16) NOT NULL, \`environment\` varchar(32) NULL, \`purchased_at\` datetime NOT NULL, \`expires_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_store_purchases_user_created\` (\`user_id\`, \`created_at\`), UNIQUE INDEX \`UQ_store_purchases_store_transaction\` (\`store\`, \`transaction_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
{{/if}}
{{/if}}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
{{#if POSTGRES}}
{{#if IAP}}
    await queryRunner.query(`DROP INDEX "public"."UQ_store_purchases_store_transaction"`);
{{/if}}
{{#if IAP}}
    await queryRunner.query(`DROP INDEX "public"."IDX_store_purchases_user_created"`);
{{/if}}
{{#if IAP}}
    await queryRunner.query(`DROP TABLE "store_purchases"`);
{{/if}}
    await queryRunner.query(`DROP INDEX "public"."UQ_payments_provider_order"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_provider_payment"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_user_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_status_created"`);
{{#if GATEWAY}}
    await queryRunner.query(`DROP TABLE "payments"`);
{{/if}}
    await queryRunner.query(`DROP INDEX "public"."IDX_entitlements_user_source_reference"`);
    await queryRunner.query(`DROP TABLE "entitlements"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_payment_products_google_product_id"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_payment_products_apple_product_id"`);
    await queryRunner.query(`DROP TABLE "payment_products"`);
{{/if}}
{{#if MYSQL}}
{{#if IAP}}
    await queryRunner.query(`DROP INDEX \`UQ_store_purchases_store_transaction\` ON \`store_purchases\``);
{{/if}}
{{#if IAP}}
    await queryRunner.query(`DROP INDEX \`IDX_store_purchases_user_created\` ON \`store_purchases\``);
{{/if}}
{{#if IAP}}
    await queryRunner.query(`DROP TABLE \`store_purchases\``);
{{/if}}
{{#if GATEWAY}}
    await queryRunner.query(`DROP INDEX \`UQ_payments_provider_order\` ON \`payments\``);
{{/if}}
{{#if GATEWAY}}
    await queryRunner.query(`DROP INDEX \`IDX_payments_provider_payment\` ON \`payments\``);
{{/if}}
{{#if GATEWAY}}
    await queryRunner.query(`DROP INDEX \`IDX_payments_user_created\` ON \`payments\``);
{{/if}}
{{#if GATEWAY}}
    await queryRunner.query(`DROP INDEX \`IDX_payments_status_created\` ON \`payments\``);
{{/if}}
{{#if GATEWAY}}
    await queryRunner.query(`DROP TABLE \`payments\``);
{{/if}}
    await queryRunner.query(`DROP INDEX \`IDX_entitlements_user_source_reference\` ON \`entitlements\``);
    await queryRunner.query(`DROP TABLE \`entitlements\``);
    await queryRunner.query(`DROP INDEX \`UQ_payment_products_google_product_id\` ON \`payment_products\``);
    await queryRunner.query(`DROP INDEX \`UQ_payment_products_apple_product_id\` ON \`payment_products\``);
    await queryRunner.query(`DROP TABLE \`payment_products\``);
{{/if}}
  }
}
