import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Category } from '../../categories/entities/category.entity';
import { ProductStatus } from '../enums/product-status.enum';
import { Inventory } from '../../inventories/entities/inventory.entity';
import { ProductImage } from '../../product-images/entities/product-image.entity';

@Entity('products')
@Index('idx_products_category_id', ['categoryId'])
@Index('idx_products_status', ['status'])
@Index('idx_products_is_featured', ['isFeatured'])
export class Product {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: string;

  @Column({
    name: 'product_code',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  productCode: string;

  @Column({
    type: 'varchar',
    length: 200,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 220,
    unique: true,
  })
  slug: string;

  @Column({
    name: 'category_id',
    type: 'bigint',
    unsigned: true,
  })
  categoryId: string;

  @ManyToOne(() => Category, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'category_id',
  })
  category: Category;

  @OneToOne(() => Inventory, (inventory) => inventory.product)
  inventory!: Inventory | null;

  @OneToMany(() => ProductImage, (image) => image.product)
  images!: ProductImage[];

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

  @Column({
    name: 'base_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  basePrice: string;

  @Column({
    name: 'sale_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  salePrice: string | null;

  @Column({
    name: 'cost_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    select: false,
  })
  costPrice: string | null;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status: ProductStatus;

  @Column({
    name: 'is_featured',
    type: 'boolean',
    default: false,
  })
  isFeatured: boolean;

  @Column({
    name: 'available_from',
    type: 'datetime',
    nullable: true,
  })
  availableFrom: Date | null;

  @Column({
    name: 'available_until',
    type: 'datetime',
    nullable: true,
  })
  availableUntil: Date | null;

  @Column({
    name: 'preparation_days',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  preparationDays: number;

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

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'datetime',
    nullable: true,
  })
  deletedAt: Date | null;
}
