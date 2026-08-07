import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

import { CouponsService } from './coupons.service';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { AvailableCouponQueryDto } from './dto/available-coupon-query.dto';

@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get('available')
  findAvailable(
    @Req() request: AuthenticatedRequest,
    @Query() query: AvailableCouponQueryDto,
  ) {
    return this.couponsService.findAvailable(request.user.id, query);
  }

  @Post('validate')
  validate(@Req() request: AuthenticatedRequest, @Body() dto: ApplyCouponDto) {
    return this.couponsService.validateForCurrentCart(
      request.user.id,
      dto.code,
    );
  }
}
