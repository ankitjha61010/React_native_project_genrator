import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema. Later changes: edit the entities, then
 *   npm run db:migration:generate -- <database dir>/migrations/<Name>
 */
export class Init1767225600000 implements MigrationInterface {
  name = 'Init1767225600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
{{#if POSTGRES}}
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(255) NOT NULL, "name" character varying(120) NOT NULL, {{#if AUTH}}"password_hash" character varying(255) NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'user', "email_verified_at" TIMESTAMP WITH TIME ZONE, "is_active" boolean NOT NULL DEFAULT true, "token_version" integer NOT NULL DEFAULT '0', "last_login_at" TIMESTAMP WITH TIME ZONE, {{#if SEC_LOCKOUT}}"failed_login_attempts" integer NOT NULL DEFAULT '0', "locked_until" TIMESTAMP WITH TIME ZONE, {{/if}}{{/if}}"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
{{#if AUTH_REFRESH}}
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "token_hash" character(64) NOT NULL, "family_id" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "replaced_by_id" uuid, "user_agent" character varying(255), "ip" character varying(45), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a7838d2ba25be1342091b6695f1" UNIQUE ("token_hash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens" ("user_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_d5e27da0cd39bc3bb2811fc8ba" ON "refresh_tokens" ("family_id") `);
{{/if}}
{{#if AUTH}}
    await queryRunner.query(
      `CREATE TABLE "user_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "type" character varying(32) NOT NULL, "token_hash" character(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ebdd918653813b59cdd5d379b5b" UNIQUE ("token_hash"), CONSTRAINT "PK_63764db9d9aaa4af33e07b2f4bf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_d02b7a4d2582540c8ad134c2db" ON "user_tokens" ("user_id", "type") `);
{{/if}}
{{#if AUTH_REFRESH}}
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
{{/if}}
{{#if AUTH}}
    await queryRunner.query(
      `ALTER TABLE "user_tokens" ADD CONSTRAINT "FK_9e144a67be49e5bba91195ef5de" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
{{/if}}
{{/if}}
{{#if MYSQL}}
    await queryRunner.query(
      'CREATE TABLE `users` (`id` varchar(36) NOT NULL, `email` varchar(255) NOT NULL, `name` varchar(120) NOT NULL, {{#if AUTH}}`password_hash` varchar(255) NOT NULL, `role` varchar(20) NOT NULL DEFAULT \'user\', `email_verified_at` datetime NULL, `is_active` tinyint NOT NULL DEFAULT 1, `token_version` int NOT NULL DEFAULT \'0\', `last_login_at` datetime NULL, {{#if SEC_LOCKOUT}}`failed_login_attempts` int NOT NULL DEFAULT \'0\', `locked_until` datetime NULL, {{/if}}{{/if}}`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_97672ac88f789774dd47f7c8be` (`email`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
{{#if AUTH_REFRESH}}
    await queryRunner.query(
      'CREATE TABLE `refresh_tokens` (`id` char(36) NOT NULL, `user_id` char(36) NOT NULL, `token_hash` char(64) NOT NULL, `family_id` char(36) NOT NULL, `expires_at` datetime NOT NULL, `revoked_at` datetime NULL, `replaced_by_id` char(36) NULL, `user_agent` varchar(255) NULL, `ip` varchar(45) NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_3ddc983c5f7bcf132fd8732c3f` (`user_id`), INDEX `IDX_d5e27da0cd39bc3bb2811fc8ba` (`family_id`), UNIQUE INDEX `IDX_a7838d2ba25be1342091b6695f` (`token_hash`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
{{/if}}
{{#if AUTH}}
    await queryRunner.query(
      'CREATE TABLE `user_tokens` (`id` varchar(36) NOT NULL, `user_id` char(36) NOT NULL, `type` varchar(32) NOT NULL, `token_hash` char(64) NOT NULL, `expires_at` datetime NOT NULL, `used_at` datetime NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_d02b7a4d2582540c8ad134c2db` (`user_id`, `type`), UNIQUE INDEX `IDX_ebdd918653813b59cdd5d379b5` (`token_hash`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
{{/if}}
{{#if AUTH_REFRESH}}
    await queryRunner.query(
      'ALTER TABLE `refresh_tokens` ADD CONSTRAINT `FK_3ddc983c5f7bcf132fd8732c3f4` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
{{/if}}
{{#if AUTH}}
    await queryRunner.query(
      'ALTER TABLE `user_tokens` ADD CONSTRAINT `FK_9e144a67be49e5bba91195ef5de` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
{{/if}}
{{/if}}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
{{#if POSTGRES}}
{{#if AUTH}}
    await queryRunner.query(`ALTER TABLE "user_tokens" DROP CONSTRAINT "FK_9e144a67be49e5bba91195ef5de"`);
{{/if}}
{{#if AUTH_REFRESH}}
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`);
{{/if}}
{{#if AUTH}}
    await queryRunner.query(`DROP INDEX "public"."IDX_d02b7a4d2582540c8ad134c2db"`);
    await queryRunner.query(`DROP TABLE "user_tokens"`);
{{/if}}
{{#if AUTH_REFRESH}}
    await queryRunner.query(`DROP INDEX "public"."IDX_d5e27da0cd39bc3bb2811fc8ba"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3ddc983c5f7bcf132fd8732c3f"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
{{/if}}
    await queryRunner.query(`DROP TABLE "users"`);
{{/if}}
{{#if MYSQL}}
{{#if AUTH}}
    await queryRunner.query('ALTER TABLE `user_tokens` DROP FOREIGN KEY `FK_9e144a67be49e5bba91195ef5de`');
{{/if}}
{{#if AUTH_REFRESH}}
    await queryRunner.query('ALTER TABLE `refresh_tokens` DROP FOREIGN KEY `FK_3ddc983c5f7bcf132fd8732c3f4`');
{{/if}}
{{#if AUTH}}
    await queryRunner.query('DROP TABLE `user_tokens`');
{{/if}}
{{#if AUTH_REFRESH}}
    await queryRunner.query('DROP TABLE `refresh_tokens`');
{{/if}}
    await queryRunner.query('DROP TABLE `users`');
{{/if}}
  }
}
