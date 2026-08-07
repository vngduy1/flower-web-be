import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartsService } from './carts.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
    roleCode?: string;
  };
}

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  getCart(@Req() request: AuthenticatedRequest) {
    const userId = this.getUserId(request);

    return this.cartsService.getCart(userId);
  }

  @Post('items')
  addItem(
    @Req() request: AuthenticatedRequest,
    @Body() addCartItemDto: AddCartItemDto,
  ) {
    const userId = this.getUserId(request);

    return this.cartsService.addItem(userId, addCartItemDto);
  }

  @Patch('items/:itemId')
  updateItem(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Body()
    updateCartItemDto: UpdateCartItemDto,
  ) {
    const userId = this.getUserId(request);

    return this.cartsService.updateItem(userId, itemId, updateCartItemDto);
  }

  @Delete('items/:itemId')
  removeItem(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
  ) {
    const userId = this.getUserId(request);

    return this.cartsService.removeItem(userId, itemId);
  }

  @Delete()
  clear(@Req() request: AuthenticatedRequest) {
    const userId = this.getUserId(request);

    return this.cartsService.clear(userId);
  }

  private getUserId(request: AuthenticatedRequest): string {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng từ access token',
      );
    }

    return userId;
  }
}
