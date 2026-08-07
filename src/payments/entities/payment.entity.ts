import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Order } from '../../orders/entities/order.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentRecordStatus } from '../enums/payment-record-status.enum';

@Entity('payments')
@Index('idx_payments_order_id', ['orderId'])
@Index('idx_payments_status', ['status'])
@Index('uq_payments_payment_number', ['paymentNumber'], {
  unique: true,
})
export class Payment {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    name: 'payment_number',
    type: 'varchar',
    length: 50,
  })
  paymentNumber!: string;

  @Column({
    name: 'order_id',
    type: 'bigint',
    unsigned: true,
  })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.payments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'order_id',
  })
  order!: Order;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.MOCK,
  })
  paymentMethod!: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentRecordStatus,
    default: PaymentRecordStatus.PENDING,
  })
  status!: PaymentRecordStatus;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  amount!: string;

  @Column({
    name: 'currency_code',
    type: 'char',
    length: 3,
    default: 'JPY',
  })
  currencyCode!: string;

  @Column({
    name: 'provider_payment_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  providerPaymentId!: string | null;

  @Column({
    name: 'failure_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  failureReason!: string | null;

  @Column({
    name: 'paid_at',
    type: 'datetime',
    nullable: true,
  })
  paidAt!: Date | null;

  @Column({
    name: 'failed_at',
    type: 'datetime',
    nullable: true,
  })
  failedAt!: Date | null;

  @Column({
    name: 'refunded_at',
    type: 'datetime',
    nullable: true,
  })
  refundedAt!: Date | null;

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
}
