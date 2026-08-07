import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { OrderStatus } from '../enums/order-status.enum';

import { Order } from './order.entity';

@Entity('order_status_histories')
@Index('idx_order_status_histories_order_id', ['orderId'])
@Index('idx_order_status_histories_changed_by_user_id', ['changedByUserId'])
@Index('idx_order_status_histories_created_at', ['createdAt'])
export class OrderStatusHistory {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: string;

  @Column({
    name: 'order_id',
    type: 'bigint',
    unsigned: true,
  })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.statusHistories, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'order_id',
  })
  order: Order;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: OrderStatus,
  })
  fromStatus: OrderStatus;

  @Column({
    name: 'to_status',
    type: 'enum',
    enum: OrderStatus,
  })
  toStatus: OrderStatus;

  @Column({
    name: 'changed_by_user_id',
    type: 'bigint',
    unsigned: true,
  })
  changedByUserId: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'changed_by_user_id',
  })
  changedByUser: User;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  note: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
  })
  createdAt: Date;
}
