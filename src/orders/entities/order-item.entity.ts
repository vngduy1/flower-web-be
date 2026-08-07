import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Product } from '../../products/entities/product.entity';

import { Order } from './order.entity';

@Entity('order_items')
@Index('idx_order_items_order_id', ['orderId'])
@Index('idx_order_items_product_id', ['productId'])
export class OrderItem {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    name: 'order_id',
    type: 'bigint',
    unsigned: true,
  })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'order_id',
  })
  order!: Order;

  @Column({
    name: 'product_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  productId!: string | null;

  @ManyToOne(() => Product, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'product_id',
  })
  product!: Product | null;

  /*
   * Snapshot mã sản phẩm tại thời điểm đặt hàng.
   */
  @Column({
    name: 'product_code',
    type: 'varchar',
    length: 50,
  })
  productCode!: string;

  /*
   * Snapshot tên sản phẩm tại thời điểm đặt hàng.
   */
  @Column({
    name: 'product_name',
    type: 'varchar',
    length: 255,
  })
  productName!: string;

  /*
   * Snapshot hình ảnh tại thời điểm đặt hàng.
   */
  @Column({
    name: 'thumbnail_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  thumbnailUrl!: string | null;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  unitPrice!: string;

  @Column({
    type: 'int',
    unsigned: true,
  })
  quantity!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  subtotal!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
  })
  createdAt!: Date;
}
