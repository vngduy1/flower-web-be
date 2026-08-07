import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from '../auth/enums/role-code.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CheckInventoriesDto } from './dto/check-inventories.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { InventoriesService } from './inventories.service';

@Controller('inventories')
export class InventoriesQueryController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  /**
   * Lấy danh sách tồn kho.
   *
   * GET /api/inventories
   * GET /api/inventories?page=1&limit=20
   * GET /api/inventories?keyword=hoa
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  findAll(
    @Query()
    queryDto: InventoryQueryDto,
  ) {
    return this.inventoriesService.findAll(queryDto);
  }

  /**
   * Lấy danh sách sắp hết hàng.
   *
   * GET /api/inventories/low-stock
   */
  @Get('low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  findLowStock() {
    return this.inventoriesService.findLowStock();
  }

  /**
   * Lấy danh sách hết hàng.
   *
   * GET /api/inventories/out-of-stock
   */
  @Get('out-of-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  findOutOfStock() {
    return this.inventoriesService.findOutOfStock();
  }

  /**
   * Kiểm tra tồn kho của nhiều sản phẩm.
   *
   * POST /api/inventories/check
   */
  @Post('check')
  checkInventories(
    @Body()
    checkInventoriesDto: CheckInventoriesDto,
  ) {
    return this.inventoriesService.checkInventories(checkInventoriesDto);
  }
}
