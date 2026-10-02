-- Payments module (prisma/payments.prisma) – its own migration, after the initial one.
{{#if POSTGRES}}
-- CreateTable
CREATE TABLE "payment_products" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "kind" VARCHAR(16) NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "access_level" VARCHAR(64) NOT NULL,
    "duration_days" INTEGER,
    "apple_product_id" VARCHAR(200),
    "google_product_id" VARCHAR(200),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "access_level" VARCHAR(64) NOT NULL,
    "source" VARCHAR(16) NOT NULL,
    "product_id" UUID,
    "reference_id" VARCHAR(255),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);
{{#if GATEWAY}}

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "provider" VARCHAR(16) NOT NULL,
    "provider_order_id" VARCHAR(255) NOT NULL,
    "provider_payment_id" VARCHAR(255),
    "amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "refunded_amount" INTEGER NOT NULL DEFAULT 0,
    "failure_reason" VARCHAR(500),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
{{/if}}
{{#if IAP}}

-- CreateTable
CREATE TABLE "store_purchases" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID,
    "store" VARCHAR(16) NOT NULL,
    "store_product_id" VARCHAR(200) NOT NULL,
    "transaction_id" VARCHAR(255) NOT NULL,
    "original_transaction_id" VARCHAR(1024),
    "status" VARCHAR(16) NOT NULL,
    "environment" VARCHAR(32),
    "purchased_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_purchases_pkey" PRIMARY KEY ("id")
);
{{/if}}

-- CreateIndex
CREATE UNIQUE INDEX "payment_products_apple_product_id_key" ON "payment_products"("apple_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_products_google_product_id_key" ON "payment_products"("google_product_id");

-- CreateIndex
CREATE INDEX "entitlements_user_id_source_reference_id_idx" ON "entitlements"("user_id", "source", "reference_id");
{{#if GATEWAY}}

-- CreateIndex
CREATE INDEX "payments_provider_provider_payment_id_idx" ON "payments"("provider", "provider_payment_id");
{{/if}}
{{#if GATEWAY}}

-- CreateIndex
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at");
{{/if}}
{{#if GATEWAY}}

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");
{{/if}}
{{#if GATEWAY}}

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_order_id_key" ON "payments"("provider", "provider_order_id");
{{/if}}
{{#if IAP}}

-- CreateIndex
CREATE INDEX "store_purchases_user_id_created_at_idx" ON "store_purchases"("user_id", "created_at");
{{/if}}
{{#if IAP}}

-- CreateIndex
CREATE UNIQUE INDEX "store_purchases_store_transaction_id_key" ON "store_purchases"("store", "transaction_id");
{{/if}}
{{/if}}
{{#if MYSQL}}
-- CreateTable
CREATE TABLE `payment_products` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(1000) NULL,
    `kind` VARCHAR(16) NOT NULL,
    `price` INTEGER NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `access_level` VARCHAR(64) NOT NULL,
    `duration_days` INTEGER NULL,
    `apple_product_id` VARCHAR(200) NULL,
    `google_product_id` VARCHAR(200) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_products_apple_product_id_key`(`apple_product_id`),
    UNIQUE INDEX `payment_products_google_product_id_key`(`google_product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entitlements` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `access_level` VARCHAR(64) NOT NULL,
    `source` VARCHAR(16) NOT NULL,
    `product_id` CHAR(36) NULL,
    `reference_id` VARCHAR(255) NULL,
    `expires_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `entitlements_user_id_source_reference_id_idx`(`user_id`, `source`, `reference_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
{{#if GATEWAY}}

-- CreateTable
CREATE TABLE `payments` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `provider` VARCHAR(16) NOT NULL,
    `provider_order_id` VARCHAR(255) NOT NULL,
    `provider_payment_id` VARCHAR(255) NULL,
    `amount` INTEGER NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `status` VARCHAR(24) NOT NULL,
    `refunded_amount` INTEGER NOT NULL DEFAULT 0,
    `failure_reason` VARCHAR(500) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payments_provider_provider_payment_id_idx`(`provider`, `provider_payment_id`),
    INDEX `payments_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `payments_status_created_at_idx`(`status`, `created_at`),
    UNIQUE INDEX `payments_provider_provider_order_id_key`(`provider`, `provider_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
{{/if}}
{{#if IAP}}

-- CreateTable
CREATE TABLE `store_purchases` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NULL,
    `store` VARCHAR(16) NOT NULL,
    `store_product_id` VARCHAR(200) NOT NULL,
    `transaction_id` VARCHAR(255) NOT NULL,
    `original_transaction_id` VARCHAR(1024) NULL,
    `status` VARCHAR(16) NOT NULL,
    `environment` VARCHAR(32) NULL,
    `purchased_at` DATETIME(3) NOT NULL,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `store_purchases_user_id_created_at_idx`(`user_id`, `created_at`),
    UNIQUE INDEX `store_purchases_store_transaction_id_key`(`store`, `transaction_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
{{/if}}
{{/if}}
