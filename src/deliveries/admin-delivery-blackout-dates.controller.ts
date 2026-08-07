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

import { DeliveryBlackoutDatesService } from './delivery-blackout-dates.service';
import { CreateDeliveryBlackoutDateDto } from './dto/create-delivery-blackout-date.dto';
import { UpdateDeliveryBlackoutDateDto } from './dto/update-delivery-blackout-date.dto';

@Controller('admin/delivery-blackout-dates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
export class AdminDeliveryBlackoutDatesController {
  constructor(
    private readonly blackoutDatesService: DeliveryBlackoutDatesService,
  ) {}

  @Post()
  create(@Body() dto: CreateDeliveryBlackoutDateDto) {
    return this.blackoutDatesService.create(dto);
  }

  @Get()
  findAll() {
    return this.blackoutDatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blackoutDatesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDeliveryBlackoutDateDto) {
    return this.blackoutDatesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blackoutDatesService.remove(id);
  }
}
