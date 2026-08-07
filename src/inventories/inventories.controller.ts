import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from '../auth/enums/role-code.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InventoriesService } from './inventories.service';

@Controller('products/:productId/inventory')
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  /**
   * Tạo thông tin tồn kho.
   *
   * POST /api/products/:productId/inventory
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  create(
    @Param('productId')
    productId: string,

    @Body()
    createInventoryDto: CreateInventoryDto,
  ) {
    return this.inventoriesService.create(productId, createInventoryDto);
  }

  /**
   * Lấy thông tin tồn kho.
   *
   * GET /api/products/:productId/inventory
   */
  @Get()
  findByProduct(
    @Param('productId')
    productId: string,
  ) {
    return this.inventoriesService.findByProduct(productId);
  }

  /**
   * Cập nhật tồn kho.
   *
   * PATCH /api/products/:productId/inventory
   */
  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  update(
    @Param('productId')
    productId: string,

    @Body()
    updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.inventoriesService.update(productId, updateInventoryDto);
  }

  /**
   * Nhập thêm hàng.
   *
   * POST /api/products/:productId/inventory/increase
   */
  @Post('increase')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  increase(
    @Param('productId')
    productId: string,

    @Body()
    adjustInventoryDto: AdjustInventoryDto,
  ) {
    return this.inventoriesService.increase(
      productId,
      adjustInventoryDto.quantity,
    );
  }

  /**
   * Giảm hàng thủ công.
   *
   * POST /api/products/:productId/inventory/decrease
   */
  @Post('decrease')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  decrease(
    @Param('productId')
    productId: string,

    @Body()
    adjustInventoryDto: AdjustInventoryDto,
  ) {
    return this.inventoriesService.decrease(
      productId,
      adjustInventoryDto.quantity,
    );
  }

  /**
   * Giữ hàng cho đơn đang xử lý.
   *
   * Endpoint này sau này nên được gọi
   * nội bộ từ OrderService.
   */
  @Post('reserve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  reserve(
    @Param('productId')
    productId: string,

    @Body()
    adjustInventoryDto: AdjustInventoryDto,
  ) {
    return this.inventoriesService.reserve(
      productId,
      adjustInventoryDto.quantity,
    );
  }

  /**
   * Giải phóng hàng đã giữ.
   */
  @Post('release')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  release(
    @Param('productId')
    productId: string,

    @Body()
    adjustInventoryDto: AdjustInventoryDto,
  ) {
    return this.inventoriesService.release(
      productId,
      adjustInventoryDto.quantity,
    );
  }

  /**
   * Xác nhận trừ hàng đã giữ.
   */
  @Post('commit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN)
  commitReservedStock(
    @Param('productId')
    productId: string,

    @Body()
    adjustInventoryDto: AdjustInventoryDto,
  ) {
    return this.inventoriesService.commitReservedStock(
      productId,
      adjustInventoryDto.quantity,
    );
  }
}
