import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CheckoutService } from './checkout.service';
import { CheckoutPreviewDto } from './dto/checkout-preview.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
    role?: string;
  };
}

@Controller('checkout')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('preview')
  preview(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CheckoutPreviewDto,
  ) {
    return this.checkoutService.preview(request.user.id, dto);
  }
}
