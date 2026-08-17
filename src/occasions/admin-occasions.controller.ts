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

import { CreateOccasionDto } from './dto/create-occasion.dto';
import { UpdateOccasionDto } from './dto/update-occasion.dto';
import { OccasionsService } from './occasions.service';
import { RoleCode } from '../auth/enums/role-code.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
@Controller('admin/occasions')
export class AdminOccasionsController {
  constructor(private readonly occasionsService: OccasionsService) {}

  @Get()
  findAll() {
    return this.occasionsService.findAllForAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.occasionsService.findOneForAdmin(id);
  }

  @Post()
  create(@Body() dto: CreateOccasionDto) {
    return this.occasionsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOccasionDto) {
    return this.occasionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.occasionsService.remove(id);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.occasionsService.restore(id);
  }
}
