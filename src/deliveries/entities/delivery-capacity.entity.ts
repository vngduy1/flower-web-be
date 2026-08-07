import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DeliveryTimeSlot } from './delivery-time-slot.entity';

@Entity('delivery_capacities')
@Index(
  'uk_delivery_capacities_date_time_slot',
  ['deliveryDate', 'timeSlotId'],
  {
    unique: true,
  },
)
@Index('idx_delivery_capacities_delivery_date', ['deliveryDate'])
@Index('idx_delivery_capacities_is_active', ['isActive'])
export class DeliveryCapacity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    name: 'delivery_date',
    type: 'date',
  })
  deliveryDate!: string;

  @Column({
    name: 'time_slot_id',
    type: 'bigint',
    unsigned: true,
  })
  timeSlotId!: string;

  @ManyToOne(() => DeliveryTimeSlot, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'time_slot_id',
  })
  timeSlot!: DeliveryTimeSlot;

  @Column({
    name: 'max_orders',
    type: 'int',
    unsigned: true,
  })
  maxOrders!: number;

  @Column({
    name: 'reserved_orders',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  reservedOrders!: number;

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
