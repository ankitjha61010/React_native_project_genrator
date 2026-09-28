import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserOrmEntity } from './user.orm-entity.js';

{{#if POSTGRES}}
const TIMESTAMP = 'timestamptz';
{{else}}
const TIMESTAMP = 'datetime';
{{/if}}

@Entity({ name: 'user_tokens' })
@Index(['userId', 'type'])
export class UserTokenOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

{{#if POSTGRES}}
  @Column({ name: 'user_id', type: 'uuid' })
{{else}}
  @Column({ name: 'user_id', type: 'char', length: 36 })
{{/if}}
  userId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: TIMESTAMP })
  expiresAt: Date;

  @Column({ name: 'used_at', type: TIMESTAMP, nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;
}
