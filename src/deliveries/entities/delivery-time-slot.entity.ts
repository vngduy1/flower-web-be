import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('delivery_time_slots')
@Index('uk_delivery_time_slots_slot_code', ['slotCode'], {
  unique: true,
})
@Index('idx_delivery_time_slots_is_active', ['isActive'])
export class DeliveryTimeSlot {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    name: 'slot_code',
    type: 'varchar',
    length: 50,
  })
  slotCode!: string;

  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 100,
  })
  displayName!: string;

  @Column({
    name: 'start_time',
    type: 'time',
  })
  startTime!: string;

  @Column({
    name: 'end_time',
    type: 'time',
  })
  endTime!: string;

  @Column({
    name: 'default_capacity',
    type: 'int',
    unsigned: true,
    default: 20,
  })
  defaultCapacity!: number;

  @Column({
    name: 'sort_order',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  sortOrder!: number;

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
