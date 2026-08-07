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

import { DeliveryCapacitiesService } from './delivery-capacities.service';
import { CreateDeliveryCapacityDto } from './dto/create-delivery-capacity.dto';
import { UpdateDeliveryCapacityDto } from './dto/update-delivery-capacity.dto';

@Controller('admin/delivery-capacities')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
export class AdminDeliveryCapacitiesController {
  constructor(private readonly capacitiesService: DeliveryCapacitiesService) {}

  @Post()
  create(@Body() dto: CreateDeliveryCapacityDto) {
    return this.capacitiesService.create(dto);
  }

  @Get()
  findAll() {
    return this.capacitiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.capacitiesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDeliveryCapacityDto) {
    return this.capacitiesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.capacitiesService.remove(id);
  }
}
