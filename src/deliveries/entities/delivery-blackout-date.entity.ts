import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('delivery_blackout_dates')
@Index('uk_delivery_blackout_dates_date', ['blackoutDate'], {
  unique: true,
})
@Index('idx_delivery_blackout_dates_is_active', ['isActive'])
export class DeliveryBlackoutDate {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    name: 'blackout_date',
    type: 'date',
  })
  blackoutDate!: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  reason!: string;

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
