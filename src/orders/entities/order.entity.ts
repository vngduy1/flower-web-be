import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

import { OrderAddress } from './order-address.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { Coupon } from '../../coupons/entities/coupon.entity';

@Entity('orders')
@Index('idx_orders_user_id', ['userId'])
@Index('idx_orders_status', ['status'])
@Index('idx_orders_payment_status', ['paymentStatus'])
@Index('idx_orders_created_at', ['createdAt'])
@Index('uq_orders_user_idempotency_key', ['userId', 'idempotencyKey'], {
  unique: true,
})
export class Order {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: string;

  @Column({
    name: 'order_number',
    type: 'varchar',
    length: 30,
    unique: true,
  })
  orderNumber: string;

  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
  })
  userId: string;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  idempotencyKey!: string | null;

  @Column({
    name: 'idempotency_fingerprint',
    type: 'char',
    length: 64,
    nullable: true,
  })
  idempotencyFingerprint!: string | null;

  @ManyToOne(() => User, (user) => user.orders, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user: User;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  subtotal: string;

  @Column({
    name: 'delivery_fee',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  deliveryFee: string;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountAmount: string;

  @Column({
    name: 'coupon_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  couponId!: string | null;

  @ManyToOne(() => Coupon, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'coupon_id',
  })
  coupon!: Coupon | null;

  /**
   * Snapshot mã coupon tại thời điểm đặt hàng.
   */
  @Column({
    name: 'coupon_code',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  couponCode!: string | null;

  /**
   * Snapshot tên coupon tại thời điểm đặt hàng.
   */
  @Column({
    name: 'coupon_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  couponName!: string | null;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  totalAmount: string;

  @Column({
    name: 'currency_code',
    type: 'char',
    length: 3,
    default: 'JPY',
  })
  currencyCode: string;

  @Column({
    name: 'delivery_date',
    type: 'date',
  })
  deliveryDate: string;

  @Column({
    name: 'delivery_time_slot_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  deliveryTimeSlotId!: string | null;

  @Column({
    name: 'delivery_time_slot',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  deliveryTimeSlot: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  note: string | null;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  items: OrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];

  @OneToMany(() => OrderStatusHistory, (statusHistory) => statusHistory.order)
  statusHistories: OrderStatusHistory[];

  @OneToOne(() => OrderAddress, (orderAddress) => orderAddress.order)
  deliveryAddress: OrderAddress;

  @Column({
    name: 'confirmed_at',
    type: 'datetime',
    nullable: true,
  })
  confirmedAt!: Date | null;

  @Column({
    name: 'preparing_at',
    type: 'datetime',
    nullable: true,
  })
  preparingAt!: Date | null;

  @Column({
    name: 'shipped_at',
    type: 'datetime',
    nullable: true,
  })
  shippedAt!: Date | null;

  @Column({
    name: 'delivered_at',
    type: 'datetime',
    nullable: true,
  })
  deliveredAt!: Date | null;

  @Column({
    name: 'cancelled_at',
    type: 'datetime',
    nullable: true,
  })
  cancelledAt!: Date | null;

  @Column({
    name: 'inventory_restored_at',
    type: 'datetime',
    nullable: true,
  })
  inventoryRestoredAt!: Date | null;

  @Column({
    name: 'delivery_capacity_released_at',
    type: 'datetime',
    nullable: true,
  })
  deliveryCapacityReleasedAt!: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
  })
  updatedAt: Date;
}
