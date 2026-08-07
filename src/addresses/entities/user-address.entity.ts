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

import { User } from '../../users/entities/user.entity';

@Entity({ name: 'user_addresses' })
@Index('idx_user_addresses_user_id', ['userId'])
@Index('idx_user_addresses_postal_code', ['postalCode'])
@Index('idx_user_addresses_user_default', ['userId', 'isDefault'])
export class UserAddress {
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

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  label: string | null;

  @Column({
    name: 'recipient_name',
    type: 'varchar',
    length: 100,
  })
  recipientName: string;

  @Column({
    name: 'recipient_phone',
    type: 'varchar',
    length: 20,
  })
  recipientPhone: string;

  @Column({
    name: 'postal_code',
    type: 'varchar',
    length: 7,
  })
  postalCode: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  prefecture: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  city: string;

  @Column({
    name: 'address_line1',
    type: 'varchar',
    length: 255,
  })
  addressLine1: string;

  @Column({
    name: 'address_line2',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  addressLine2: string | null;

  @Column({
    name: 'is_default',
    type: 'boolean',
    default: false,
  })
  isDefault: boolean;

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

  @ManyToOne(() => User, (user) => user.addresses, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user: User;
}
