import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { MediaCrop } from '{{IMPORT:domain.chat}}';
import { JSON_TYPE, TIMESTAMP, UuidColumn } from '{{IMPORT:typeorm.columns}}';
import { UserOrmEntity } from '{{IMPORT:typeorm.user}}';

@Entity({ name: 'conversations' })
export class ConversationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
{{#if GROUP_CHAT}}

  @Column({ type: 'varchar', length: 120, nullable: true })
  title: string | null;

  @Column({ name: 'is_group', type: 'boolean', default: false })
  isGroup: boolean;

  @Column({ name: 'avatar_url', type: 'varchar', length: 1024, nullable: true })
  avatarUrl: string | null;
{{/if}}

  @UuidColumn({ name: 'created_by_id' })
  createdById: string;

  @Column({ name: 'last_message_at', type: TIMESTAMP, nullable: true })
  lastMessageAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: TIMESTAMP })
  updatedAt: Date;
}

@Entity({ name: 'conversation_members' })
export class ConversationMemberOrmEntity {
  @PrimaryColumn({ name: 'conversation_id', {{#if POSTGRES}}type: 'uuid'{{else}}type: 'char', length: 36{{/if}} })
  conversationId: string;

  @Index()
  @PrimaryColumn({ name: 'user_id', {{#if POSTGRES}}type: 'uuid'{{else}}type: 'char', length: 36{{/if}} })
  userId: string;

  @ManyToOne(() => ConversationOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: ConversationOrmEntity;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;
{{#if GROUP_CHAT}}

  /** `admin` or `member`. */
  @Column({ type: 'varchar', length: 16, default: 'member' })
  role: string;
{{/if}}

  @Column({ name: 'last_read_at', type: TIMESTAMP, nullable: true })
  lastReadAt: Date | null;

  @Column({ name: 'cleared_at', type: TIMESTAMP, nullable: true })
  clearedAt: Date | null;

  /** "Delete chat": out of the list until a new message arrives. */
  @Column({ type: 'boolean', default: false })
  hidden: boolean;

  @CreateDateColumn({ name: 'joined_at', type: TIMESTAMP })
  joinedAt: Date;
}

@Entity({ name: 'messages' })
@Index(['conversationId', 'createdAt'])
export class MessageOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @UuidColumn({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => ConversationOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: ConversationOrmEntity;

  @Index()
  @UuidColumn({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender?: UserOrmEntity;

  @Column({ type: 'varchar', length: 16 })
  type: string;

  @Column({ type: 'text', nullable: true })
  text: string | null;

  @Column({ name: 'media_url', type: 'varchar', length: 1024, nullable: true })
  mediaUrl: string | null;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 1024, nullable: true })
  thumbnailUrl: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ name: 'file_size', type: 'varchar', length: 32, nullable: true })
  fileSize: string | null;

  @Column({ type: 'int', nullable: true })
  duration: number | null;

  @Column({ type: JSON_TYPE, nullable: true })
  crop: MediaCrop | null;

  /** `system` messages: what happened (SystemEvent). */
  @Column({ type: 'varchar', length: 32, nullable: true })
  event: string | null;

  /** `system` messages: who it happened to. */
  @UuidColumn({ name: 'target_user_id', nullable: true })
  targetUserId: string | null;

  /** The message this one replies to. */
  @UuidColumn({ name: 'reply_to_id', nullable: true })
  replyToId: string | null;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP })
  createdAt: Date;

  @Column({ name: 'deleted_at', type: TIMESTAMP, nullable: true })
  deletedAt: Date | null;
}
