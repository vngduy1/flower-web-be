import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Role } from '../../roles/entities/role.entity';
import { UserAddress } from '../../addresses/entities/user-address.entity';
import { Order } from '../../orders/entities/order.entity';
import { UserStatus } from '../enums/user-status.enum';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Index()
  @Column({
    name: 'role_id',
    type: 'bigint',
    unsigned: true,
  })
  roleId!: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  email!: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash!: string;

  @Column({
    name: 'full_name',
    type: 'varchar',
    length: 100,
  })
  fullName!: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  phone!: string | null;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Column({
    name: 'email_verification_code',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  emailVerificationCode!: string | null;

  @Column({
    name: 'email_verification_expires_at',
    type: 'datetime',
    nullable: true,
  })
  emailVerificationExpiresAt!: Date | null;

  @Column({
    name: 'email_verified_at',
    type: 'datetime',
    nullable: true,
  })
  emailVerifiedAt!: Date | null;

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

  @ManyToOne(() => Role, (role) => role.users, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'role_id',
  })
  role!: Role;

  @OneToMany(() => UserAddress, (address) => address.user)
  addresses!: UserAddress[];

  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];
}
