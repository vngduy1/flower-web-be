import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { OrderItem } from '../../orders/entities/order-item.entity';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

import { ReviewStatus } from '../enums/review-status.enum';

@Entity('product_reviews')
@Index('idx_product_reviews_product_id', ['productId'])
@Index('idx_product_reviews_user_id', ['userId'])
@Index('idx_product_reviews_status', ['status'])
@Index('idx_product_reviews_created_at', ['createdAt'])
@Index('uq_product_reviews_order_item_id', ['orderItemId'], {
  unique: true,
})
export class ProductReview {
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

  @ManyToOne(() => Product, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'product_id',
  })
  product!: Product;

  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
  })
  userId!: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user!: User;

  @Column({
    name: 'order_item_id',
    type: 'bigint',
    unsigned: true,
  })
  orderItemId!: string;

  @OneToOne(() => OrderItem, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'order_item_id',
  })
  orderItem!: OrderItem;

  @Column({
    type: 'tinyint',
    unsigned: true,
  })
  rating!: number;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  title!: string | null;

  @Column({
    type: 'text',
  })
  comment!: string;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status!: ReviewStatus;

  @Column({
    name: 'admin_comment',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  adminComment!: string | null;

  @Column({
    name: 'approved_at',
    type: 'datetime',
    nullable: true,
  })
  approvedAt!: Date | null;

  @Column({
    name: 'rejected_at',
    type: 'datetime',
    nullable: true,
  })
  rejectedAt!: Date | null;

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

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'datetime',
    nullable: true,
  })
  deletedAt!: Date | null;
}
