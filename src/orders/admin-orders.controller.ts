import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from '../auth/enums/role-code.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

import { AdminOrdersService } from './admin-orders.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  findAll(@Query() query: AdminOrderQueryDto) {
    return this.adminOrdersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminOrdersService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.adminOrdersService.updateStatus(request.user.id, id, dto);
  }
}
