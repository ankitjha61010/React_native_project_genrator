import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { NotificationData } from '{{IMPORT:domain.notification}}';
import { JSON_TYPE, TIMESTAMP, UuidColumn } from './columns.js';
import { UserOrmEntity } from './user.orm-entity.js';

@Entity({ name: 'devices' })
export class DeviceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @UuidColumn({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ type: 'varchar', length: 512, unique: true })
  token: string;

  @Column({ type: 'varchar', length: 16 })
  platform: string;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: TIMESTAMP })
  updatedAt: Date;
}

@Entity({ name: 'notifications' })
@Index(['userId', 'createdAt'])
@Index(['userId', 'readAt'])
export class NotificationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @UuidColumn({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 1000 })
  body: string;

  @Column({ type: JSON_TYPE })
  data: NotificationData;

  @Column({ name: 'read_at', type: TIMESTAMP, nullable: true })
  readAt: Date | null;

  @UuidColumn({ name: 'broadcast_id', nullable: true })
  broadcastId: string | null;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;
}

@Entity({ name: 'broadcasts' })
export class BroadcastOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 1000 })
  body: string;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: JSON_TYPE })
  data: NotificationData;

  @Column({ type: 'varchar', length: 16 })
  audience: string;

  @UuidColumn({ name: 'sent_by_id' })
  sentById: string;

  @Column({ name: 'recipient_count', type: 'int', default: 0 })
  recipientCount: number;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;
}
