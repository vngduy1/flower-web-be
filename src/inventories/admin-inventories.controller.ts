import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from '../auth/enums/role-code.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

import { AdminInventoriesService } from './admin-inventories.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { AdminInventoryQueryDto } from './dto/admin-inventory-query.dto';
import { InventoryHistoryQueryDto } from './dto/inventory-history-query.dto';
import { UpdateInventorySettingsDto } from './dto/update-inventory-settings.dto';

@Controller('admin/inventories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
export class AdminInventoriesController {
  constructor(
    private readonly adminInventoriesService: AdminInventoriesService,
  ) {}

  @Get()
  findAll(@Query() query: AdminInventoryQueryDto) {
    return this.adminInventoriesService.findAll(query);
  }

  @Get(':productId')
  findOne(@Param('productId') productId: string) {
    return this.adminInventoriesService.findOne(productId);
  }

  @Patch(':productId/settings')
  updateSettings(
    @Param('productId') productId: string,
    @Body() dto: UpdateInventorySettingsDto,
  ) {
    return this.adminInventoriesService.updateSettings(productId, dto);
  }

  @Post(':productId/adjust')
  adjust(
    @Req() request: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.adminInventoriesService.adjust(request.user.id, productId, dto);
  }

  @Get(':productId/histories')
  findHistories(
    @Param('productId') productId: string,
    @Query() query: InventoryHistoryQueryDto,
  ) {
    return this.adminInventoriesService.findHistories(productId, query);
  }
}
