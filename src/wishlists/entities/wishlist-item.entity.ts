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
import { User } from '../../users/entities/user.entity';

@Entity('wishlist_items')
@Index('uq_wishlist_items_user_product', ['userId', 'productId'], {
  unique: true,
})
@Index('idx_wishlist_items_user_id', ['userId'])
@Index('idx_wishlist_items_product_id', ['productId'])
export class WishlistItem {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
  })
  userId!: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user!: User;

  @Column({
    name: 'product_id',
    type: 'bigint',
    unsigned: true,
  })
  productId!: string;

  @ManyToOne(() => Product, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'product_id',
  })
  product!: Product;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
  })
  createdAt!: Date;
}
