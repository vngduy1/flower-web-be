import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('delivery_areas')
@Index('uk_delivery_areas_prefecture_city', ['prefecture', 'city'], {
  unique: true,
})
@Index('idx_delivery_areas_is_active', ['isActive'])
export class DeliveryArea {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  prefecture!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  city!: string;

  @Column({
    name: 'area_name',
    type: 'varchar',
    length: 150,
  })
  areaName!: string;

  @Column({
    name: 'delivery_fee',
    type: 'decimal',
    precision: 10,
    scale: 0,
  })
  deliveryFee!: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

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
}
