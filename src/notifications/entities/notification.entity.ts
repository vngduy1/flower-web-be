import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

import { NotificationType } from '../enums/notification-type.enum';

@Entity('notifications')
@Index('idx_notifications_user', ['userId'])
@Index('idx_notifications_read', ['isRead'])
@Index('idx_notifications_created', ['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
  })
  userId!: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user!: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type!: NotificationType;

  @Column({
    type: 'varchar',
    length: 200,
  })
  title!: string;

  @Column({
    type: 'text',
  })
  message!: string;

  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  referenceType!: string | null;

  @Column({
    name: 'reference_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  referenceId!: string | null;

  @Column({
    name: 'is_read',
    type: 'boolean',
    default: false,
  })
  isRead!: boolean;

  @Column({
    name: 'read_at',
    type: 'datetime',
    nullable: true,
  })
  readAt!: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
  })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'datetime',
    nullable: true,
  })
  deletedAt!: Date | null;
}
