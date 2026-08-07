import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Product } from '../../products/entities/product.entity';

@Entity('product_inventories')
@Index('uq_product_inventories_product_id', ['productId'], {
  unique: true,
})
export class Inventory {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: string;

  @Column({
    name: 'product_id',
    type: 'bigint',
    unsigned: true,
  })
  productId!: string;

  @OneToOne(() => Product, (product) => product.inventory, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'product_id',
  })
  product!: Product;

  /**
   * Tổng số lượng thực tế trong kho.
   */
  @Column({
    name: 'stock_quantity',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  stockQuantity!: number;

  /**
   * Số lượng đang được giữ cho đơn hàng
   * chưa hoàn tất.
   */
  @Column({
    name: 'reserved_quantity',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  reservedQuantity: number;

  /**
   * Ngưỡng cảnh báo sắp hết hàng.
   */
  @Column({
    name: 'low_stock_threshold',
    type: 'int',
    unsigned: true,
    default: 5,
  })
  lowStockThreshold: number;

  /**
   * Có quản lý tồn kho hay không.
   *
   * false:
   * sản phẩm luôn được coi là còn hàng.
   */
  @Column({
    name: 'is_stock_managed',
    type: 'boolean',
    default: true,
  })
  isStockManaged: boolean;

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

  /**
   * Số lượng hiện có thể bán.
   *
   * Đây không phải cột trong database.
   */
  get availableQuantity(): number {
    if (!this.isStockManaged) {
      return Number.MAX_SAFE_INTEGER;
    }

    return Math.max(this.stockQuantity - this.reservedQuantity, 0);
  }

  /**
   * Kiểm tra sản phẩm sắp hết hàng.
   */
  get isLowStock(): boolean {
    if (!this.isStockManaged) {
      return false;
    }

    return this.availableQuantity <= this.lowStockThreshold;
  }

  /**
   * Kiểm tra sản phẩm hết hàng.
   */
  get isOutOfStock(): boolean {
    if (!this.isStockManaged) {
      return false;
    }

    return this.availableQuantity <= 0;
  }
}
