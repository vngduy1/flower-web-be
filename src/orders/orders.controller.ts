import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { CancelOrderDto } from './dto/cancel-order.dto';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email?: string;
  };
};

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: CreateOrderDto,

    @Headers('idempotency-key')
    idempotencyKey?: string,
  ) {
    return this.ordersService.create(request.user.id, dto, idempotencyKey);
  }

  @Get()
  findAll(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.ordersService.findAll(request.user.id);
  }

  @Get(':id')
  findOne(
    @Req()
    request: AuthenticatedRequest,

    @Param('id')
    orderId: string,
  ) {
    return this.ordersService.findOne(request.user.id, orderId);
  }

  @Patch(':id/cancel')
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancel(request.user.id, id, dto.reason);
  }
}
