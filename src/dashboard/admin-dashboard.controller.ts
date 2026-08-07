import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from '../auth/enums/role-code.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { DashboardService } from './dashboard.service';
import { DashboardRevenueQueryDto } from './dto/dashboard-revenue-query.dto';
import { DashboardTopProductsQueryDto } from './dto/dashboard-top-products-query.dto';
import { DashboardLowStockQueryDto } from './dto/dashboard-low-stock-query.dto';
import { DashboardRecentQueryDto } from './dto/dashboard-recent-query.dto';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN, RoleCode.STAFF)
export class AdminDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('revenue-chart')
  getRevenueChart(@Query() query: DashboardRevenueQueryDto) {
    return this.dashboardService.getRevenueChart(query.from, query.to);
  }

  @Get('top-products')
  getTopProducts(
    @Query()
    query: DashboardTopProductsQueryDto,
  ) {
    return this.dashboardService.getTopProducts(query.limit);
  }

  @Get('low-stock-products')
  getLowStockProducts(@Query() query: DashboardLowStockQueryDto) {
    return this.dashboardService.getLowStockProducts(query.limit);
  }

  @Get('recent-reviews')
  getRecentReviews(@Query() query: DashboardRecentQueryDto) {
    return this.dashboardService.getRecentReviews(query.limit);
  }

  @Get('recent-users')
  getRecentUsers(@Query() query: DashboardRecentQueryDto) {
    return this.dashboardService.getRecentUsers(query.limit);
  }

  @Get('recent-notifications')
  getRecentNotifications(@Query() query: DashboardRecentQueryDto) {
    return this.dashboardService.getRecentNotifications(query.limit);
  }
}
