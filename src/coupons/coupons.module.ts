import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CartsModule } from '../carts/carts.module';

import { AdminCouponsController } from './admin-coupons.controller';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { CouponUsage } from './entities/coupon-usage.entity';
import { Coupon } from './entities/coupon.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Coupon, CouponUsage]), CartsModule],

  controllers: [AdminCouponsController, CouponsController],

  providers: [CouponsService],

  exports: [CouponsService],
})
export class CouponsModule {}
