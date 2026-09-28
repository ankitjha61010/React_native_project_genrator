import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { UserOrmEntity } from './user.orm-entity.js';

{{#if POSTGRES}}
const TIMESTAMP = 'timestamptz';
const UUID = 'uuid';
{{else}}
const TIMESTAMP = 'datetime';
const UUID = 'char';
{{/if}}

@Entity({ name: 'refresh_tokens' })
export class RefreshTokenOrmEntity {
  /** Set by the app – it is the JWT `jti`. */
{{#if POSTGRES}}
  @PrimaryColumn({ type: UUID })
{{else}}
  @PrimaryColumn({ type: UUID, length: 36 })
{{/if}}
  id: string;

  @Index()
{{#if POSTGRES}}
  @Column({ name: 'user_id', type: UUID })
{{else}}
  @Column({ name: 'user_id', type: UUID, length: 36 })
{{/if}}
  userId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash: string;

  @Index()
{{#if POSTGRES}}
  @Column({ name: 'family_id', type: UUID })
{{else}}
  @Column({ name: 'family_id', type: UUID, length: 36 })
{{/if}}
  familyId: string;

  @Column({ name: 'expires_at', type: TIMESTAMP })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: TIMESTAMP, nullable: true })
  revokedAt: Date | null;

{{#if POSTGRES}}
  @Column({ name: 'replaced_by_id', type: UUID, nullable: true })
{{else}}
  @Column({ name: 'replaced_by_id', type: UUID, length: 36, nullable: true })
{{/if}}
  replacedById: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;
}
