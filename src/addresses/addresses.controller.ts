import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
    role?: string;
  };
}

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(request.user.id, dto);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.addressesService.findAll(request.user.id);
  }

  @Get(':id')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') addressId: string,
  ) {
    return this.addressesService.findOne(request.user.id, addressId);
  }

  @Patch(':id/default')
  setDefault(
    @Req() request: AuthenticatedRequest,
    @Param('id') addressId: string,
  ) {
    return this.addressesService.setDefault(request.user.id, addressId);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(request.user.id, addressId, dto);
  }

  @Delete(':id')
  remove(@Req() request: AuthenticatedRequest, @Param('id') addressId: string) {
    return this.addressesService.remove(request.user.id, addressId);
  }
}
