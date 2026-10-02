{{#if POSTGRES}}
{{#if AUTH}}
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

{{/if}}
{{#if DEVICES}}
-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('IOS', 'ANDROID', 'WEB');

{{/if}}
-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
{{#if AUTH}}
    "email" VARCHAR(255),
{{else}}
    "email" VARCHAR(255) NOT NULL,
{{/if}}
    "name" VARCHAR(120) NOT NULL,
{{#if AUTH}}
    "password_hash" VARCHAR(255),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "email_verified_at" TIMESTAMP(3),
    "country_code" VARCHAR(8),
    "phone" VARCHAR(20),
    "phone_verified_at" TIMESTAMP(3),
    "avatar_url" VARCHAR(1024),
    "location" VARCHAR(120),
    "bio" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3),
{{/if}}
{{#if SEC_LOCKOUT}}
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
{{/if}}
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
{{#if AUTH_REFRESH}}

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "family_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by_id" UUID,
    "user_agent" VARCHAR(255),
    "ip" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
{{/if}}
{{#if DB_CODES}}

-- CreateTable
CREATE TABLE "verification_codes" (
    "id" UUID NOT NULL,
    "purpose" VARCHAR(32) NOT NULL,
    "target" VARCHAR(255) NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);
{{/if}}
{{#if SOCIAL}}

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);
{{/if}}
{{#if CHAT}}

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
{{#if GROUP_CHAT}}
    "title" VARCHAR(120),
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "avatar_url" VARCHAR(1024),
{{/if}}
    "created_by_id" UUID NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_members" (
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
{{#if GROUP_CHAT}}
    "role" VARCHAR(16) NOT NULL DEFAULT 'member',
{{/if}}
    "last_read_at" TIMESTAMP(3),
    "cleared_at" TIMESTAMP(3),
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "text" TEXT,
    "media_url" VARCHAR(1024),
    "thumbnail_url" VARCHAR(1024),
    "file_name" VARCHAR(255),
    "file_size" VARCHAR(32),
    "duration" INTEGER,
    "crop" JSONB,
    "event" VARCHAR(32),
    "target_user_id" UUID,
    "reply_to_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
{{/if}}
{{#if NOTIFICATIONS}}

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" VARCHAR(128) NOT NULL,
    "fcm_token" VARCHAR(512),
    "device_type" "DeviceType" NOT NULL,
    "device_model" VARCHAR(120),
    "os_version" VARCHAR(32),
    "app_version" VARCHAR(32),
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "data" JSONB NOT NULL,
    "read_at" TIMESTAMP(3),
    "broadcast_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "data" JSONB NOT NULL,
    "audience" VARCHAR(16) NOT NULL,
    "sent_by_id" UUID NOT NULL,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);
{{/if}}
{{#if LEGAL}}

-- CreateTable
CREATE TABLE "legal_settings" (
    "id" VARCHAR(16) NOT NULL,
    "terms_url" VARCHAR(2048),
    "privacy_policy_url" VARCHAR(2048),
    "delete_account_url" VARCHAR(2048),
    "terms_html" TEXT,
    "privacy_policy_html" TEXT,
    "delete_account_html" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_settings_pkey" PRIMARY KEY ("id")
);
{{/if}}

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
{{#if AUTH}}

-- CreateIndex
{{#if AUTH}}
CREATE UNIQUE INDEX "users_country_code_phone_key" ON "users"("country_code", "phone");
{{/if}}
{{/if}}
{{#if AUTH_REFRESH}}

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");
{{/if}}
{{#if DB_CODES}}

-- CreateIndex
CREATE INDEX "verification_codes_purpose_target_idx" ON "verification_codes"("purpose", "target");
{{/if}}
{{#if SOCIAL}}

-- CreateIndex
CREATE INDEX "social_accounts_user_id_idx" ON "social_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_provider_provider_user_id_key" ON "social_accounts"("provider", "provider_user_id");
{{/if}}
{{#if CHAT}}

-- CreateIndex
CREATE INDEX "conversation_members_user_id_idx" ON "conversation_members"("user_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");
{{/if}}
{{#if NOTIFICATIONS}}

-- CreateIndex
CREATE UNIQUE INDEX "devices_device_id_key" ON "devices"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "devices_fcm_token_key" ON "devices"("fcm_token");

-- CreateIndex
CREATE INDEX "devices_user_id_idx" ON "devices"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
{{/if}}
{{#if AUTH_REFRESH}}

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
{{/if}}
{{#if SOCIAL}}

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
{{/if}}
{{#if CHAT}}

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
{{/if}}
{{#if NOTIFICATIONS}}

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
{{/if}}
{{/if}}
{{#if MYSQL}}
-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
{{#if AUTH}}
    `email` VARCHAR(255) NULL,
{{else}}
    `email` VARCHAR(255) NOT NULL,
{{/if}}
    `name` VARCHAR(120) NOT NULL,
{{#if AUTH}}
    `password_hash` VARCHAR(255) NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `email_verified_at` DATETIME(3) NULL,
    `country_code` VARCHAR(8) NULL,
    `phone` VARCHAR(20) NULL,
    `phone_verified_at` DATETIME(3) NULL,
    `avatar_url` VARCHAR(1024) NULL,
    `location` VARCHAR(120) NULL,
    `bio` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `token_version` INTEGER NOT NULL DEFAULT 0,
    `last_login_at` DATETIME(3) NULL,
    `last_seen_at` DATETIME(3) NULL,
{{/if}}
{{#if SEC_LOCKOUT}}
    `failed_login_attempts` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
{{/if}}
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
{{#if AUTH}}
    UNIQUE INDEX `users_country_code_phone_key`(`country_code`, `phone`),
{{/if}}
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
{{#if AUTH_REFRESH}}

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `family_id` CHAR(36) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `replaced_by_id` CHAR(36) NULL,
    `user_agent` VARCHAR(255) NULL,
    `ip` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    INDEX `refresh_tokens_user_id_idx`(`user_id`),
    INDEX `refresh_tokens_family_id_idx`(`family_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
{{/if}}
{{#if DB_CODES}}

-- CreateTable
CREATE TABLE `verification_codes` (
    `id` CHAR(36) NOT NULL,
    `purpose` VARCHAR(32) NOT NULL,
    `target` VARCHAR(255) NOT NULL,
    `code_hash` CHAR(64) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `verification_codes_purpose_target_idx`(`purpose`, `target`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
{{/if}}
{{#if SOCIAL}}

-- CreateTable
CREATE TABLE `social_accounts` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `provider` VARCHAR(20) NOT NULL,
    `provider_user_id` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `social_accounts_user_id_idx`(`user_id`),
    UNIQUE INDEX `social_accounts_provider_provider_user_id_key`(`provider`, `provider_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
{{/if}}
{{#if CHAT}}

-- CreateTable
CREATE TABLE `conversations` (
    `id` CHAR(36) NOT NULL,
{{#if GROUP_CHAT}}
    `title` VARCHAR(120) NULL,
    `is_group` BOOLEAN NOT NULL DEFAULT false,
    `avatar_url` VARCHAR(1024) NULL,
{{/if}}
    `created_by_id` CHAR(36) NOT NULL,
    `last_message_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_members` (
    `conversation_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
{{#if GROUP_CHAT}}
    `role` VARCHAR(16) NOT NULL DEFAULT 'member',
{{/if}}
    `last_read_at` DATETIME(3) NULL,
    `cleared_at` DATETIME(3) NULL,
    `hidden` BOOLEAN NOT NULL DEFAULT false,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conversation_members_user_id_idx`(`user_id`),
    PRIMARY KEY (`conversation_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` CHAR(36) NOT NULL,
    `conversation_id` CHAR(36) NOT NULL,
    `sender_id` CHAR(36) NOT NULL,
    `type` VARCHAR(16) NOT NULL,
    `text` TEXT NULL,
    `media_url` VARCHAR(1024) NULL,
    `thumbnail_url` VARCHAR(1024) NULL,
    `file_name` VARCHAR(255) NULL,
    `file_size` VARCHAR(32) NULL,
    `duration` INTEGER NULL,
    `crop` JSON NULL,
    `event` VARCHAR(32) NULL,
    `target_user_id` CHAR(36) NULL,
    `reply_to_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `messages_conversation_id_created_at_idx`(`conversation_id`, `created_at`),
    INDEX `messages_sender_id_idx`(`sender_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
{{/if}}
{{#if NOTIFICATIONS}}

-- CreateTable
CREATE TABLE `devices` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `device_id` VARCHAR(128) NOT NULL,
    `fcm_token` VARCHAR(512) NULL,
    `device_type` ENUM('IOS', 'ANDROID', 'WEB') NOT NULL,
    `device_model` VARCHAR(120) NULL,
    `os_version` VARCHAR(32) NULL,
    `app_version` VARCHAR(32) NULL,
    `last_active_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `devices_device_id_key`(`device_id`),
    UNIQUE INDEX `devices_fcm_token_key`(`fcm_token`),
    INDEX `devices_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` VARCHAR(1000) NOT NULL,
    `data` JSON NOT NULL,
    `read_at` DATETIME(3) NULL,
    `broadcast_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `notifications_user_id_read_at_idx`(`user_id`, `read_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `broadcasts` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` VARCHAR(1000) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `data` JSON NOT NULL,
    `audience` VARCHAR(16) NOT NULL,
    `sent_by_id` CHAR(36) NOT NULL,
    `recipient_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
{{/if}}
{{#if LEGAL}}

-- CreateTable
CREATE TABLE `legal_settings` (
    `id` VARCHAR(16) NOT NULL,
    `terms_url` VARCHAR(2048) NULL,
    `privacy_policy_url` VARCHAR(2048) NULL,
    `delete_account_url` VARCHAR(2048) NULL,
    `terms_html` LONGTEXT NULL,
    `privacy_policy_html` LONGTEXT NULL,
    `delete_account_html` LONGTEXT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
{{/if}}
{{#if AUTH_REFRESH}}

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
{{/if}}
{{#if SOCIAL}}

-- AddForeignKey
ALTER TABLE `social_accounts` ADD CONSTRAINT `social_accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
{{/if}}
{{#if CHAT}}

-- AddForeignKey
ALTER TABLE `conversation_members` ADD CONSTRAINT `conversation_members_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_members` ADD CONSTRAINT `conversation_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
{{/if}}
{{#if NOTIFICATIONS}}

-- AddForeignKey
ALTER TABLE `devices` ADD CONSTRAINT `devices_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
{{/if}}
{{/if}}
