import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Order } from '../../orders/entities/order.entity';

import { GiftCardType } from '../enums/gift-card-type.enum';

@Entity('gift_messages')
export class GiftMessage {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    name: 'order_id',
    type: 'bigint',
    unsigned: true,
    unique: true,
  })
  orderId!: string;

  @OneToOne(() => Order, (order) => order.giftMessage, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'order_id',
  })
  order!: Order;

  @Column({
    name: 'card_type',
    type: 'enum',
    enum: GiftCardType,
  })
  cardType!: GiftCardType;

  @Column({
    type: 'varchar',
    length: 500,
  })
  message!: string;

  @Column({
    name: 'sender_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  senderName!: string | null;

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
