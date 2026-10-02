import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index, Unique } from 'typeorm';

// ─── Call Entity (TypeORM) ────────────────────────────────────────────────────

@Entity('calls')
@Index(['callerId'])
@Index(['receiverId'])
@Index(['status'])
@Index(['createdAt'])
export class CallOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'caller_id' })
  callerId!: string;

  @Column({ name: 'receiver_id', nullable: true })
  receiverId?: string;

  @Column({ name: 'call_type', type: 'varchar', length: 10 })
  callType!: 'audio' | 'video';

  @Column({ name: 'is_group_call', default: false })
  isGroupCall!: boolean;

  @Column({ name: 'channel_name', unique: true })
  channelName!: string;

  @Column({ type: 'varchar', length: 20, default: 'initiating' })
  status!: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ name: 'answered_at', type: 'timestamptz', nullable: true })
  answeredAt?: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date;

  @Column({ type: 'int', nullable: true })
  duration?: number;

  @Column({ name: 'end_reason', type: 'varchar', length: 20, nullable: true })
  endReason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => CallParticipantOrmEntity, p => p.call, { cascade: true })
  participants?: CallParticipantOrmEntity[];
}

// ─── CallParticipant Entity (TypeORM) ────────────────────────────────────────

@Entity('call_participants')
@Unique(['callId', 'userId'])
@Index(['userId'])
@Index(['callId'])
export class CallParticipantOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'call_id' })
  callId!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'joined_at', type: 'timestamptz', nullable: true })
  joinedAt?: Date;

  @Column({ name: 'left_at', type: 'timestamptz', nullable: true })
  leftAt?: Date;

  @Column({ type: 'varchar', length: 20, default: 'invited' })
  status!: string;

  @Column({ type: 'varchar', length: 20, default: 'participant' })
  role!: string;

  /** Deleted from this user's call history. */
  @Column({ name: 'hidden_at', type: 'timestamptz', nullable: true })
  hiddenAt?: Date;

  @ManyToOne(() => CallOrmEntity, c => c.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'call_id' })
  call?: CallOrmEntity;
}
