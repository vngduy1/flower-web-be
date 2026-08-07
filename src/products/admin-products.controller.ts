import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from '../auth/enums/role-code.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { AdminProductsService } from './admin-products.service';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN, RoleCode.STAFF)
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get()
  findAll(@Query() query: AdminProductQueryDto) {
    return this.adminProductsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminProductsService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateProductStatusDto) {
    return this.adminProductsService.updateStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminProductsService.remove(id);
  }
}
