import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CouponDiscountType } from '../enums/coupon-discount-type.enum';
import { CouponUsage } from './coupon-usage.entity';

@Entity('coupons')
@Index('uq_coupons_code', ['code'], {
  unique: true,
})
@Index('idx_coupons_is_active', ['isActive'])
@Index('idx_coupons_valid_period', ['startsAt', 'endsAt'])
export class Coupon {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  code!: string;

  @Column({
    type: 'varchar',
    length: 150,
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  description!: string | null;

  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: CouponDiscountType,
  })
  discountType!: CouponDiscountType;

  /**
   * FIXED_AMOUNT:
   *   Số tiền giảm, ví dụ 1000 JPY.
   *
   * PERCENTAGE:
   *   Tỷ lệ giảm, ví dụ 10 tương ứng 10%.
   */
  @Column({
    name: 'discount_value',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  discountValue!: string;

  /**
   * Giá trị đơn tối thiểu để được dùng coupon.
   */
  @Column({
    name: 'minimum_order_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  minimumOrderAmount!: string;

  /**
   * Giới hạn số tiền giảm tối đa.
   * Chủ yếu dùng với coupon phần trăm.
   */
  @Column({
    name: 'maximum_discount_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  maximumDiscountAmount!: string | null;

  /**
   * Tổng số lần coupon được phép sử dụng.
   * null = không giới hạn.
   */
  @Column({
    name: 'usage_limit',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  usageLimit!: number | null;

  /**
   * Tổng số lần đã sử dụng.
   */
  @Column({
    name: 'used_count',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  usedCount!: number;

  /**
   * Số lần tối đa một user được dùng coupon.
   * null = không giới hạn theo user.
   */
  @Column({
    name: 'per_user_limit',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  perUserLimit!: number | null;

  @Column({
    name: 'starts_at',
    type: 'datetime',
  })
  startsAt!: Date;

  @Column({
    name: 'ends_at',
    type: 'datetime',
  })
  endsAt!: Date;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @OneToMany(() => CouponUsage, (usage) => usage.coupon)
  usages!: CouponUsage[];

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
