import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { CartItem } from './cart-item.entity';

@Entity('carts')
@Index('uq_carts_user_id', ['userId'], {
  unique: true,
})
export class Cart {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: string;

  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
  })
  userId: string;

  @OneToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user: User;

  @OneToMany(() => CartItem, (cartItem) => cartItem.cart)
  items: CartItem[];

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
