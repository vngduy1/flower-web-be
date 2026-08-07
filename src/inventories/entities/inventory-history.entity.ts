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

import { Inventory } from './inventory.entity';
import { InventoryChangeType } from '../enums/inventory-change-type.enum';

@Entity('inventory_histories')
@Index('idx_inventory_histories_inventory_id', ['inventoryId'])
@Index('idx_inventory_histories_product_id', ['productId'])
@Index('idx_inventory_histories_changed_by', ['changedByUserId'])
@Index('idx_inventory_histories_created_at', ['createdAt'])
export class InventoryHistory {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    name: 'inventory_id',
    type: 'bigint',
    unsigned: true,
  })
  inventoryId!: string;

  @ManyToOne(() => Inventory, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'inventory_id',
  })
  inventory!: Inventory;

  @Column({
    name: 'product_id',
    type: 'bigint',
    unsigned: true,
  })
  productId!: string;

  @ManyToOne(() => Product, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'product_id',
  })
  product!: Product;

  @Column({
    name: 'change_type',
    type: 'enum',
    enum: InventoryChangeType,
  })
  changeType!: InventoryChangeType;

  @Column({
    name: 'quantity_before',
    type: 'int',
    unsigned: true,
  })
  quantityBefore!: number;

  /**
   * Số dương khi tăng, số âm khi giảm.
   */
  @Column({
    name: 'quantity_change',
    type: 'int',
  })
  quantityChange!: number;

  @Column({
    name: 'quantity_after',
    type: 'int',
    unsigned: true,
  })
  quantityAfter!: number;

  @Column({
    name: 'reserved_before',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  reservedBefore!: number;

  @Column({
    name: 'reserved_after',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  reservedAfter!: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  reason!: string | null;

  @Column({
    name: 'changed_by_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  changedByUserId!: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'changed_by_user_id',
  })
  changedByUser!: User | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
  })
  createdAt!: Date;
}
