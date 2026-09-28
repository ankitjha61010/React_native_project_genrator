import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema. Later changes: edit the entities, then
 *   npm run db:migration:generate -- <database dir>/migrations/<Name>
 */
export class Init1767225600000 implements MigrationInterface {
  name = 'Init1767225600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
{{#if POSTGRES}}
    await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), {{#if AUTH}}"email" character varying(255), {{else}}"email" character varying(255) NOT NULL, {{/if}}"name" character varying(120) NOT NULL, {{#if AUTH}}"password_hash" character varying(255), {{/if}}{{#if AUTH}}"role" character varying(20) NOT NULL DEFAULT 'user', {{/if}}{{#if AUTH}}"email_verified_at" TIMESTAMP WITH TIME ZONE, {{/if}}{{#if AUTH}}"country_code" character varying(8), {{/if}}{{#if AUTH}}"phone" character varying(20), {{/if}}{{#if AUTH}}"phone_verified_at" TIMESTAMP WITH TIME ZONE, {{/if}}{{#if AUTH}}"avatar_url" character varying(1024), {{/if}}{{#if AUTH}}"location" character varying(120), {{/if}}{{#if AUTH}}"bio" character varying(500), {{/if}}{{#if AUTH}}"is_active" boolean NOT NULL DEFAULT true, {{/if}}{{#if AUTH}}"token_version" integer NOT NULL DEFAULT '0', {{/if}}{{#if AUTH}}"last_login_at" TIMESTAMP WITH TIME ZONE, {{/if}}{{#if AUTH}}"last_seen_at" TIMESTAMP WITH TIME ZONE, {{/if}}{{#if SEC_LOCKOUT}}"failed_login_attempts" integer NOT NULL DEFAULT '0', {{/if}}{{#if SEC_LOCKOUT}}"locked_until" TIMESTAMP WITH TIME ZONE, {{/if}}"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
{{#if AUTH}}
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_87cebbf022b6599d2bc56fc820" ON "users"  ("country_code", "phone") `);
{{/if}}
{{#if AUTH_REFRESH}}
    await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "token_hash" character(64) NOT NULL, "family_id" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "replaced_by_id" uuid, "user_agent" character varying(255), "ip" character varying(45), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a7838d2ba25be1342091b6695f1" UNIQUE ("token_hash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens"  ("user_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_d5e27da0cd39bc3bb2811fc8ba" ON "refresh_tokens"  ("family_id") `);
{{/if}}
{{#if CODES}}
    await queryRunner.query(`CREATE TABLE "verification_codes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "purpose" character varying(32) NOT NULL, "target" character varying(255) NOT NULL, "code_hash" character(64) NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_18741b6b8bf1680dbf5057421d7" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_54284002da260979b2d18f5b5f" ON "verification_codes"  ("purpose", "target") `);
{{/if}}
{{#if SOCIAL}}
    await queryRunner.query(`CREATE TABLE "social_accounts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "provider" character varying(20) NOT NULL, "provider_user_id" character varying(255) NOT NULL, "email" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e9e58d2d8e9fafa20af914d9750" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_05a0f282d3bed93ca048a7e54d" ON "social_accounts"  ("user_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4508a993f9340ca4e7547db4ff" ON "social_accounts"  ("provider", "provider_user_id") `);
{{/if}}
{{#if CHAT}}
    await queryRunner.query(`CREATE TABLE "conversations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" character varying(120), "is_group" boolean NOT NULL DEFAULT false, "avatar_url" character varying(1024), "created_by_id" uuid NOT NULL, "last_message_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "conversation_members" ("conversation_id" uuid NOT NULL, "user_id" uuid NOT NULL, "last_read_at" TIMESTAMP WITH TIME ZONE, "cleared_at" TIMESTAMP WITH TIME ZONE, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5fa9076068b6f2a26fb793d2439" PRIMARY KEY ("conversation_id", "user_id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_a46c76be8f62c4b00a835cdc37" ON "conversation_members"  ("user_id") `);
    await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "conversation_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "type" character varying(16) NOT NULL, "text" text, "media_url" character varying(1024), "thumbnail_url" character varying(1024), "file_name" character varying(255), "file_size" character varying(32), "duration" integer, "crop" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_22133395bd13b970ccd0c34ab2" ON "messages"  ("sender_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_8584a1974e1ca95f4861d975ff" ON "messages"  ("conversation_id", "created_at") `);
{{/if}}
{{#if NOTIFICATIONS}}
    await queryRunner.query(`CREATE TABLE "devices" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "token" character varying(512) NOT NULL, "platform" character varying(16) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_653b03d2083d8c66240b8df066e" UNIQUE ("token"), CONSTRAINT "PK_b1514758245c12daf43486dd1f0" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_5e9bee993b4ce35c3606cda194" ON "devices"  ("user_id") `);
    await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "type" character varying(20) NOT NULL, "title" character varying(200) NOT NULL, "body" character varying(1000) NOT NULL, "data" jsonb NOT NULL, "read_at" TIMESTAMP WITH TIME ZONE, "broadcast_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_5323ccd23482802bd9759e88ee" ON "notifications"  ("user_id", "read_at") `);
    await queryRunner.query(`CREATE INDEX "IDX_310667f935698fcd8cb319113a" ON "notifications"  ("user_id", "created_at") `);
    await queryRunner.query(`CREATE TABLE "broadcasts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" character varying(200) NOT NULL, "body" character varying(1000) NOT NULL, "type" character varying(20) NOT NULL, "data" jsonb NOT NULL, "audience" character varying(16) NOT NULL, "sent_by_id" uuid NOT NULL, "recipient_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b0586900034d0726bbdcb1b21b2" PRIMARY KEY ("id"))`);
{{/if}}
{{#if AUTH_REFRESH}}
    await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
{{/if}}
{{#if SOCIAL}}
    await queryRunner.query(`ALTER TABLE "social_accounts" ADD CONSTRAINT "FK_05a0f282d3bed93ca048a7e54dd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
{{/if}}
{{#if CHAT}}
    await queryRunner.query(`ALTER TABLE "conversation_members" ADD CONSTRAINT "FK_36340a1704b039608e34244511f" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "conversation_members" ADD CONSTRAINT "FK_a46c76be8f62c4b00a835cdc370" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
{{/if}}
{{#if NOTIFICATIONS}}
    await queryRunner.query(`ALTER TABLE "devices" ADD CONSTRAINT "FK_5e9bee993b4ce35c3606cda194c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
{{/if}}
{{/if}}
{{#if MYSQL}}
    await queryRunner.query(`CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, {{#if AUTH}}\`email\` varchar(255) NULL, {{else}}\`email\` varchar(255) NOT NULL, {{/if}}\`name\` varchar(120) NOT NULL, {{#if AUTH}}\`password_hash\` varchar(255) NULL, {{/if}}{{#if AUTH}}\`role\` varchar(20) NOT NULL DEFAULT 'user', {{/if}}{{#if AUTH}}\`email_verified_at\` datetime NULL, {{/if}}{{#if AUTH}}\`country_code\` varchar(8) NULL, {{/if}}{{#if AUTH}}\`phone\` varchar(20) NULL, {{/if}}{{#if AUTH}}\`phone_verified_at\` datetime NULL, {{/if}}{{#if AUTH}}\`avatar_url\` varchar(1024) NULL, {{/if}}{{#if AUTH}}\`location\` varchar(120) NULL, {{/if}}{{#if AUTH}}\`bio\` varchar(500) NULL, {{/if}}{{#if AUTH}}\`is_active\` tinyint NOT NULL DEFAULT 1, {{/if}}{{#if AUTH}}\`token_version\` int NOT NULL DEFAULT '0', {{/if}}{{#if AUTH}}\`last_login_at\` datetime NULL, {{/if}}{{#if AUTH}}\`last_seen_at\` datetime NULL, {{/if}}{{#if SEC_LOCKOUT}}\`failed_login_attempts\` int NOT NULL DEFAULT '0', {{/if}}{{#if SEC_LOCKOUT}}\`locked_until\` datetime NULL, {{/if}}\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), {{#if AUTH}}UNIQUE INDEX \`IDX_87cebbf022b6599d2bc56fc820\` (\`country_code\`, \`phone\`), {{/if}}UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
{{#if AUTH_REFRESH}}
    await queryRunner.query(`CREATE TABLE \`refresh_tokens\` (\`id\` char(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`token_hash\` char(64) NOT NULL, \`family_id\` char(36) NOT NULL, \`expires_at\` datetime NOT NULL, \`revoked_at\` datetime NULL, \`replaced_by_id\` char(36) NULL, \`user_agent\` varchar(255) NULL, \`ip\` varchar(45) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_3ddc983c5f7bcf132fd8732c3f\` (\`user_id\`), INDEX \`IDX_d5e27da0cd39bc3bb2811fc8ba\` (\`family_id\`), UNIQUE INDEX \`IDX_a7838d2ba25be1342091b6695f\` (\`token_hash\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
{{/if}}
{{#if CODES}}
    await queryRunner.query(`CREATE TABLE \`verification_codes\` (\`id\` varchar(36) NOT NULL, \`purpose\` varchar(32) NOT NULL, \`target\` varchar(255) NOT NULL, \`code_hash\` char(64) NOT NULL, \`attempts\` int NOT NULL DEFAULT '0', \`expires_at\` datetime NOT NULL, \`used_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_54284002da260979b2d18f5b5f\` (\`purpose\`, \`target\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
{{/if}}
{{#if SOCIAL}}
    await queryRunner.query(`CREATE TABLE \`social_accounts\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`provider\` varchar(20) NOT NULL, \`provider_user_id\` varchar(255) NOT NULL, \`email\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_05a0f282d3bed93ca048a7e54d\` (\`user_id\`), UNIQUE INDEX \`IDX_4508a993f9340ca4e7547db4ff\` (\`provider\`, \`provider_user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
{{/if}}
{{#if CHAT}}
    await queryRunner.query(`CREATE TABLE \`conversations\` (\`id\` varchar(36) NOT NULL, \`title\` varchar(120) NULL, \`is_group\` tinyint NOT NULL DEFAULT 0, \`avatar_url\` varchar(1024) NULL, \`created_by_id\` char(36) NOT NULL, \`last_message_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`conversation_members\` (\`conversation_id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`last_read_at\` datetime NULL, \`cleared_at\` datetime NULL, \`joined_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_a46c76be8f62c4b00a835cdc37\` (\`user_id\`), PRIMARY KEY (\`conversation_id\`, \`user_id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`messages\` (\`id\` varchar(36) NOT NULL, \`conversation_id\` varchar(36) NOT NULL, \`sender_id\` varchar(36) NOT NULL, \`type\` varchar(16) NOT NULL, \`text\` text NULL, \`media_url\` varchar(1024) NULL, \`thumbnail_url\` varchar(1024) NULL, \`file_name\` varchar(255) NULL, \`file_size\` varchar(32) NULL, \`duration\` int NULL, \`crop\` json NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`deleted_at\` datetime NULL, INDEX \`IDX_22133395bd13b970ccd0c34ab2\` (\`sender_id\`), INDEX \`IDX_8584a1974e1ca95f4861d975ff\` (\`conversation_id\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
{{/if}}
{{#if NOTIFICATIONS}}
    await queryRunner.query(`CREATE TABLE \`devices\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`token\` varchar(512) NOT NULL, \`platform\` varchar(16) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_5e9bee993b4ce35c3606cda194\` (\`user_id\`), UNIQUE INDEX \`IDX_653b03d2083d8c66240b8df066\` (\`token\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`notifications\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`type\` varchar(20) NOT NULL, \`title\` varchar(200) NOT NULL, \`body\` varchar(1000) NOT NULL, \`data\` json NOT NULL, \`read_at\` datetime NULL, \`broadcast_id\` char(36) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_5323ccd23482802bd9759e88ee\` (\`user_id\`, \`read_at\`), INDEX \`IDX_310667f935698fcd8cb319113a\` (\`user_id\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`broadcasts\` (\`id\` varchar(36) NOT NULL, \`title\` varchar(200) NOT NULL, \`body\` varchar(1000) NOT NULL, \`type\` varchar(20) NOT NULL, \`data\` json NOT NULL, \`audience\` varchar(16) NOT NULL, \`sent_by_id\` char(36) NOT NULL, \`recipient_count\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
{{/if}}
{{#if AUTH_REFRESH}}
    await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD CONSTRAINT \`FK_3ddc983c5f7bcf132fd8732c3f4\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
{{/if}}
{{#if SOCIAL}}
    await queryRunner.query(`ALTER TABLE \`social_accounts\` ADD CONSTRAINT \`FK_05a0f282d3bed93ca048a7e54dd\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
{{/if}}
{{#if CHAT}}
    await queryRunner.query(`ALTER TABLE \`conversation_members\` ADD CONSTRAINT \`FK_36340a1704b039608e34244511f\` FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`conversation_members\` ADD CONSTRAINT \`FK_a46c76be8f62c4b00a835cdc370\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_3bc55a7c3f9ed54b520bb5cfe23\` FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_22133395bd13b970ccd0c34ab22\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
{{/if}}
{{#if NOTIFICATIONS}}
    await queryRunner.query(`ALTER TABLE \`devices\` ADD CONSTRAINT \`FK_5e9bee993b4ce35c3606cda194c\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_9a8a82462cab47c73d25f49261f\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
{{/if}}
{{/if}}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
{{#if POSTGRES}}
{{#if NOTIFICATIONS}}
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
    await queryRunner.query(`ALTER TABLE "devices" DROP CONSTRAINT "FK_5e9bee993b4ce35c3606cda194c"`);
{{/if}}
{{#if CHAT}}
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_22133395bd13b970ccd0c34ab22"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23"`);
    await queryRunner.query(`ALTER TABLE "conversation_members" DROP CONSTRAINT "FK_a46c76be8f62c4b00a835cdc370"`);
    await queryRunner.query(`ALTER TABLE "conversation_members" DROP CONSTRAINT "FK_36340a1704b039608e34244511f"`);
{{/if}}
{{#if SOCIAL}}
    await queryRunner.query(`ALTER TABLE "social_accounts" DROP CONSTRAINT "FK_05a0f282d3bed93ca048a7e54dd"`);
{{/if}}
{{#if AUTH_REFRESH}}
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`);
{{/if}}
{{#if NOTIFICATIONS}}
    await queryRunner.query(`DROP TABLE "broadcasts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_310667f935698fcd8cb319113a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5323ccd23482802bd9759e88ee"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5e9bee993b4ce35c3606cda194"`);
    await queryRunner.query(`DROP TABLE "devices"`);
{{/if}}
{{#if CHAT}}
    await queryRunner.query(`DROP INDEX "public"."IDX_8584a1974e1ca95f4861d975ff"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_22133395bd13b970ccd0c34ab2"`);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a46c76be8f62c4b00a835cdc37"`);
    await queryRunner.query(`DROP TABLE "conversation_members"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
{{/if}}
{{#if SOCIAL}}
    await queryRunner.query(`DROP INDEX "public"."IDX_4508a993f9340ca4e7547db4ff"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_05a0f282d3bed93ca048a7e54d"`);
    await queryRunner.query(`DROP TABLE "social_accounts"`);
{{/if}}
{{#if CODES}}
    await queryRunner.query(`DROP INDEX "public"."IDX_54284002da260979b2d18f5b5f"`);
    await queryRunner.query(`DROP TABLE "verification_codes"`);
{{/if}}
{{#if AUTH_REFRESH}}
    await queryRunner.query(`DROP INDEX "public"."IDX_d5e27da0cd39bc3bb2811fc8ba"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3ddc983c5f7bcf132fd8732c3f"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
{{/if}}
{{#if AUTH}}
    await queryRunner.query(`DROP INDEX "public"."IDX_87cebbf022b6599d2bc56fc820"`);
{{/if}}
    await queryRunner.query(`DROP TABLE "users"`);
{{/if}}
{{#if MYSQL}}
{{#if NOTIFICATIONS}}
    await queryRunner.query(`ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_9a8a82462cab47c73d25f49261f\``);
    await queryRunner.query(`ALTER TABLE \`devices\` DROP FOREIGN KEY \`FK_5e9bee993b4ce35c3606cda194c\``);
{{/if}}
{{#if CHAT}}
    await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_22133395bd13b970ccd0c34ab22\``);
    await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_3bc55a7c3f9ed54b520bb5cfe23\``);
    await queryRunner.query(`ALTER TABLE \`conversation_members\` DROP FOREIGN KEY \`FK_a46c76be8f62c4b00a835cdc370\``);
    await queryRunner.query(`ALTER TABLE \`conversation_members\` DROP FOREIGN KEY \`FK_36340a1704b039608e34244511f\``);
{{/if}}
{{#if SOCIAL}}
    await queryRunner.query(`ALTER TABLE \`social_accounts\` DROP FOREIGN KEY \`FK_05a0f282d3bed93ca048a7e54dd\``);
{{/if}}
{{#if AUTH_REFRESH}}
    await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP FOREIGN KEY \`FK_3ddc983c5f7bcf132fd8732c3f4\``);
{{/if}}
{{#if NOTIFICATIONS}}
    await queryRunner.query(`DROP TABLE \`broadcasts\``);
    await queryRunner.query(`DROP INDEX \`IDX_310667f935698fcd8cb319113a\` ON \`notifications\``);
    await queryRunner.query(`DROP INDEX \`IDX_5323ccd23482802bd9759e88ee\` ON \`notifications\``);
    await queryRunner.query(`DROP TABLE \`notifications\``);
    await queryRunner.query(`DROP INDEX \`IDX_653b03d2083d8c66240b8df066\` ON \`devices\``);
    await queryRunner.query(`DROP INDEX \`IDX_5e9bee993b4ce35c3606cda194\` ON \`devices\``);
    await queryRunner.query(`DROP TABLE \`devices\``);
{{/if}}
{{#if CHAT}}
    await queryRunner.query(`DROP INDEX \`IDX_8584a1974e1ca95f4861d975ff\` ON \`messages\``);
    await queryRunner.query(`DROP INDEX \`IDX_22133395bd13b970ccd0c34ab2\` ON \`messages\``);
    await queryRunner.query(`DROP TABLE \`messages\``);
    await queryRunner.query(`DROP INDEX \`IDX_a46c76be8f62c4b00a835cdc37\` ON \`conversation_members\``);
    await queryRunner.query(`DROP TABLE \`conversation_members\``);
    await queryRunner.query(`DROP TABLE \`conversations\``);
{{/if}}
{{#if SOCIAL}}
    await queryRunner.query(`DROP INDEX \`IDX_4508a993f9340ca4e7547db4ff\` ON \`social_accounts\``);
    await queryRunner.query(`DROP INDEX \`IDX_05a0f282d3bed93ca048a7e54d\` ON \`social_accounts\``);
    await queryRunner.query(`DROP TABLE \`social_accounts\``);
{{/if}}
{{#if CODES}}
    await queryRunner.query(`DROP INDEX \`IDX_54284002da260979b2d18f5b5f\` ON \`verification_codes\``);
    await queryRunner.query(`DROP TABLE \`verification_codes\``);
{{/if}}
{{#if AUTH_REFRESH}}
    await queryRunner.query(`DROP INDEX \`IDX_a7838d2ba25be1342091b6695f\` ON \`refresh_tokens\``);
    await queryRunner.query(`DROP INDEX \`IDX_d5e27da0cd39bc3bb2811fc8ba\` ON \`refresh_tokens\``);
    await queryRunner.query(`DROP INDEX \`IDX_3ddc983c5f7bcf132fd8732c3f\` ON \`refresh_tokens\``);
    await queryRunner.query(`DROP TABLE \`refresh_tokens\``);
{{/if}}
    await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
{{#if AUTH}}
    await queryRunner.query(`DROP INDEX \`IDX_87cebbf022b6599d2bc56fc820\` ON \`users\``);
{{/if}}
    await queryRunner.query(`DROP TABLE \`users\``);
{{/if}}
  }
}
