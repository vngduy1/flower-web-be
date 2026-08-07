import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Product } from '../../products/entities/product.entity';

@Entity('product_images')
@Index('idx_product_images_product_id', ['productId'])
@Index('idx_product_images_sort_order', ['productId', 'sortOrder'])
export class ProductImage {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    name: 'product_id',
    type: 'bigint',
    unsigned: true,
  })
  productId!: string;

  @ManyToOne(() => Product, (product) => product.images, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'product_id',
  })
  product!: Product;

  @Column({
    name: 'original_url',
    type: 'varchar',
    length: 500,
  })
  originalUrl!: string;

  @Column({
    name: 'large_url',
    type: 'varchar',
    length: 500,
  })
  largeUrl!: string;

  // Ảnh medium mặc định dùng khi hiển thị sản phẩm
  @Column({
    name: 'image_url',
    type: 'varchar',
    length: 500,
  })
  imageUrl!: string;

  @Column({
    name: 'thumbnail_url',
    type: 'varchar',
    length: 500,
  })
  thumbnailUrl!: string;

  @Column({
    name: 'alt_text',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  altText: string | null;

  @Column({
    name: 'sort_order',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  sortOrder: number;

  @Column({
    name: 'is_primary',
    type: 'boolean',
    default: false,
  })
  isPrimary: boolean;

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
