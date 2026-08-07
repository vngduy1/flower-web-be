import {
  Body,
  Controller,
  Delete,
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

import { DeliveryAreasService } from './delivery-areas.service';
import { CreateDeliveryAreaDto } from './dto/create-delivery-area.dto';
import { UpdateDeliveryAreaDto } from './dto/update-delivery-area.dto';

@Controller('admin/delivery-areas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
export class AdminDeliveryAreasController {
  constructor(private readonly deliveryAreasService: DeliveryAreasService) {}

  @Post()
  create(@Body() dto: CreateDeliveryAreaDto) {
    return this.deliveryAreasService.create(dto);
  }

  @Get()
  findAll() {
    return this.deliveryAreasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveryAreasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDeliveryAreaDto) {
    return this.deliveryAreasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deliveryAreasService.remove(id);
  }
}
