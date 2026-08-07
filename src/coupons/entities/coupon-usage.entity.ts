import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';

import { Coupon } from './coupon.entity';

@Entity('coupon_usages')
@Index('idx_coupon_usages_coupon_id', ['couponId'])
@Index('idx_coupon_usages_user_id', ['userId'])
@Index('idx_coupon_usages_order_id', ['orderId'])
@Index('uq_coupon_usages_order_id', ['orderId'], {
  unique: true,
})
export class CouponUsage {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    name: 'coupon_id',
    type: 'bigint',
    unsigned: true,
  })
  couponId!: string;

  @ManyToOne(() => Coupon, (coupon) => coupon.usages, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'coupon_id',
  })
  coupon!: Coupon;

  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
  })
  userId!: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user!: User;

  @Column({
    name: 'order_id',
    type: 'bigint',
    unsigned: true,
  })
  orderId!: string;

  @ManyToOne(() => Order, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'order_id',
  })
  order!: Order;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  discountAmount!: string;

  @Column({
    name: 'is_reversed',
    type: 'boolean',
    default: false,
  })
  isReversed!: boolean;

  @Column({
    name: 'reversed_at',
    type: 'datetime',
    nullable: true,
  })
  reversedAt!: Date | null;

  @CreateDateColumn({
    name: 'used_at',
    type: 'datetime',
  })
  usedAt!: Date;
}
