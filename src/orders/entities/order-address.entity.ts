import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Order } from './order.entity';

@Entity('order_addresses')
@Index('uq_order_addresses_order_id', ['orderId'], {
  unique: true,
})
export class OrderAddress {
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

  @OneToOne(() => Order, (order) => order.deliveryAddress, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'order_id',
  })
  order: Order;

  @Column({
    name: 'recipient_name',
    type: 'varchar',
    length: 100,
  })
  recipientName: string;

  @Column({
    name: 'recipient_phone',
    type: 'varchar',
    length: 30,
  })
  recipientPhone: string;

  @Column({
    name: 'postal_code',
    type: 'varchar',
    length: 7,
  })
  postalCode: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  prefecture: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  city: string;

  @Column({
    name: 'address_line1',
    type: 'varchar',
    length: 255,
  })
  addressLine1: string;

  @Column({
    name: 'address_line2',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  addressLine2: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
  })
  createdAt: Date;
}
