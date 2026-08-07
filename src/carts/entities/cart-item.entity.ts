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

import { Product } from '../../products/entities/product.entity';
import { Cart } from './cart.entity';

@Entity('cart_items')
@Index('uq_cart_items_cart_product', ['cartId', 'productId'], {
  unique: true,
})
@Index('idx_cart_items_cart_id', ['cartId'])
@Index('idx_cart_items_product_id', ['productId'])
export class CartItem {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: string;

  @Column({
    name: 'cart_id',
    type: 'bigint',
    unsigned: true,
  })
  cartId: string;

  @ManyToOne(() => Cart, (cart) => cart.items, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'cart_id',
  })
  cart: Cart;

  @Column({
    name: 'product_id',
    type: 'bigint',
    unsigned: true,
  })
  productId: string;

  @ManyToOne(() => Product, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'product_id',
  })
  product: Product;

  @Column({
    type: 'int',
    unsigned: true,
  })
  quantity: number;

  /**
   * Giá tại thời điểm thêm vào giỏ.
   *
   * Có thể dùng để hiển thị biến động giá.
   * Khi tạo Order vẫn phải lấy lại giá hiện tại.
   */
  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  unitPrice: string;

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
