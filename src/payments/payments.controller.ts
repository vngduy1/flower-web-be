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

import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Req() request: any, @Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(request.user.id, createPaymentDto);
  }

  @Get(':id')
  findOne(@Req() request: any, @Param('id') id: string) {
    return this.paymentsService.findOne(request.user.id, id);
  }

  @Post(':id/confirm')
  confirm(@Req() request: any, @Param('id') id: string) {
    return this.paymentsService.confirm(request.user.id, id);
  }

  @Post(':id/fail')
  fail(@Req() request: any, @Param('id') id: string) {
    return this.paymentsService.fail(request.user.id, id);
  }
}
