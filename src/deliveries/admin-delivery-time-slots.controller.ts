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

import { DeliveryTimeSlotsService } from './delivery-time-slots.service';
import { CreateDeliveryTimeSlotDto } from './dto/create-delivery-time-slot.dto';
import { UpdateDeliveryTimeSlotDto } from './dto/update-delivery-time-slot.dto';

@Controller('admin/delivery-time-slots')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
export class AdminDeliveryTimeSlotsController {
  constructor(
    private readonly deliveryTimeSlotsService: DeliveryTimeSlotsService,
  ) {}

  @Post()
  create(@Body() dto: CreateDeliveryTimeSlotDto) {
    return this.deliveryTimeSlotsService.create(dto);
  }

  @Get()
  findAll() {
    return this.deliveryTimeSlotsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveryTimeSlotsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDeliveryTimeSlotDto) {
    return this.deliveryTimeSlotsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deliveryTimeSlotsService.remove(id);
  }
}
