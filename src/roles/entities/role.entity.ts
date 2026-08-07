import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: string;

  @Column({
    name: 'role_code',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  roleCode: string;

  @Column({
    name: 'role_name',
    type: 'varchar',
    length: 100,
  })
  roleName: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

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

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}
