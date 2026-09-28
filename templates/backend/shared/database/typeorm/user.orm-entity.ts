import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// Column types are always explicit: the app runs with tsx / Vitest, which don't emit
// decorator type metadata.
{{#if POSTGRES}}
const TIMESTAMP = 'timestamptz';
{{else}}
const TIMESTAMP = 'datetime';
{{/if}}

@Entity({ name: 'users' })
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;
{{#if AUTH}}

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role: string;

  @Column({ name: 'email_verified_at', type: TIMESTAMP, nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'token_version', type: 'int', default: 0 })
  tokenVersion: number;

  @Column({ name: 'last_login_at', type: TIMESTAMP, nullable: true })
  lastLoginAt: Date | null;
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
