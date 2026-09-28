import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { TIMESTAMP, UuidColumn } from './columns.js';
import { UserOrmEntity } from './user.orm-entity.js';
{{#if AUTH_REFRESH}}

@Entity({ name: 'refresh_tokens' })
export class RefreshTokenOrmEntity {
  /** Set by the app – it is the JWT `jti`. */
  @PrimaryColumn({ {{#if POSTGRES}}type: 'uuid'{{else}}type: 'char', length: 36{{/if}} })
  id: string;

  @Index()
  @UuidColumn({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash: string;

  @Index()
  @UuidColumn({ name: 'family_id' })
  familyId: string;

  @Column({ name: 'expires_at', type: TIMESTAMP })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: TIMESTAMP, nullable: true })
  revokedAt: Date | null;

  @UuidColumn({ name: 'replaced_by_id', nullable: true })
  replacedById: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;
}
{{/if}}
{{#if CODES}}

@Entity({ name: 'verification_codes' })
@Index(['purpose', 'target'])
export class VerificationCodeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32 })
  purpose: string;

  @Column({ type: 'varchar', length: 255 })
  target: string;

  @Column({ name: 'code_hash', type: 'char', length: 64 })
  codeHash: string;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'expires_at', type: TIMESTAMP })
  expiresAt: Date;

  @Column({ name: 'used_at', type: TIMESTAMP, nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;
}
{{/if}}
{{#if SOCIAL}}

@Entity({ name: 'social_accounts' })
@Index(['provider', 'providerUserId'], { unique: true })
export class SocialAccountOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @UuidColumn({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ type: 'varchar', length: 20 })
  provider: string;

  @Column({ name: 'provider_user_id', type: 'varchar', length: 255 })
  providerUserId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;
}
{{/if}}
