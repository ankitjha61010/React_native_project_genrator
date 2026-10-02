import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { TIMESTAMP } from '{{IMPORT:typeorm.columns}}';

/** One row (id "default"): the legal links + pages edited in the admin panel. */
@Entity({ name: 'legal_settings' })
export class LegalSettingsOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 16 })
  id: string;

  @Column({ name: 'terms_url', type: 'varchar', length: 2048, nullable: true })
  termsUrl: string | null;

  @Column({ name: 'privacy_policy_url', type: 'varchar', length: 2048, nullable: true })
  privacyPolicyUrl: string | null;

  @Column({ name: 'delete_account_url', type: 'varchar', length: 2048, nullable: true })
  deleteAccountUrl: string | null;

  @Column({ name: 'terms_html', type: '{{#if POSTGRES}}text{{else}}longtext{{/if}}', nullable: true })
  termsHtml: string | null;

  @Column({ name: 'privacy_policy_html', type: '{{#if POSTGRES}}text{{else}}longtext{{/if}}', nullable: true })
  privacyPolicyHtml: string | null;

  @Column({ name: 'delete_account_html', type: '{{#if POSTGRES}}text{{else}}longtext{{/if}}', nullable: true })
  deleteAccountHtml: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: TIMESTAMP })
  updatedAt: Date;
}
