import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from '../auth/enums/role-code.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { CouponsService } from './coupons.service';
import { AdminCouponQueryDto } from './dto/admin-coupon-query.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponUsageQueryDto } from './dto/coupon-usage-query.dto';

@Controller('admin/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN, RoleCode.STAFF)
export class AdminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Get()
  findAll(@Query() query: AdminCouponQueryDto) {
    return this.couponsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  @Get(':id/usages')
  findUsages(@Param('id') id: string, @Query() query: CouponUsageQueryDto) {
    return this.couponsService.findUsages(id, query);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
