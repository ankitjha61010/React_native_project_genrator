import { Column, CreateDateColumn, Entity, {{#if AUTH}}Index, {{/if}}PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TIMESTAMP } from '{{IMPORT:typeorm.columns}}';

@Entity({ name: 'users' })
{{#if AUTH}}
@Index(['countryCode', 'phone'], { unique: true })
{{/if}}
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

{{#if AUTH}}
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string | null;
{{else}}
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;
{{/if}}

  @Column({ type: 'varchar', length: 120 })
  name: string;
{{#if AUTH}}

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role: string;

  @Column({ name: 'email_verified_at', type: TIMESTAMP, nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ name: 'country_code', type: 'varchar', length: 8, nullable: true })
  countryCode: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'phone_verified_at', type: TIMESTAMP, nullable: true })
  phoneVerifiedAt: Date | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 1024, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bio: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'token_version', type: 'int', default: 0 })
  tokenVersion: number;

  @Column({ name: 'last_login_at', type: TIMESTAMP, nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'last_seen_at', type: TIMESTAMP, nullable: true })
  lastSeenAt: Date | null;
{{#if SEC_LOCKOUT}}

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: TIMESTAMP, nullable: true })
  lockedUntil: Date | null;
{{/if}}
{{/if}}

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: TIMESTAMP })
  updatedAt: Date;
}
