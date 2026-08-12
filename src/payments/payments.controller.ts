import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(request.user.id, createPaymentDto);
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.paymentsService.findOne(request.user.id, id);
  }

  @Post(':id/confirm')
  confirm(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.paymentsService.confirm(request.user.id, id);
  }

  @Post(':id/fail')
  fail(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.paymentsService.fail(request.user.id, id);
  }
}
