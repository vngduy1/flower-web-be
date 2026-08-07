import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { DeliveryAvailabilityService } from './delivery-availability.service';

@Controller('delivery')
@UseGuards(JwtAuthGuard)
export class DeliveryController {
  constructor(
    private readonly deliveryAvailabilityService: DeliveryAvailabilityService,
  ) {}

  /**
   * Danh sách khu vực đang hỗ trợ giao hàng.
   *
   * GET /api/delivery/areas
   */
  @Get('areas')
  getActiveAreas() {
    return this.deliveryAvailabilityService.getActiveAreas();
  }

  /**
   * Danh sách ngày còn có thể giao hàng.
   *
   * GET /api/delivery/available-dates
   */
  @Get('available-dates')
  getAvailableDates() {
    return this.deliveryAvailabilityService.getAvailableDates();
  }

  /**
   * Danh sách khung giờ còn chỗ theo ngày.
   *
   * GET /api/delivery/time-slots?date=2026-08-05
   */
  @Get('time-slots')
  getAvailableTimeSlots(@Query('date') date: string) {
    return this.deliveryAvailabilityService.getAvailableTimeSlots(date);
  }

  /**
   * Lấy phí giao hàng theo địa chỉ.
   *
   * GET /api/delivery/fee
   *     ?prefecture=神奈川県
   *     &city=川崎市幸区
   */
  @Get('fee')
  getDeliveryFee(
    @Query('prefecture') prefecture: string,
    @Query('city') city: string,
  ) {
    return this.deliveryAvailabilityService.getDeliveryFee(prefecture, city);
  }
}
