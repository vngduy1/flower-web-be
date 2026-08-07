import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { WishlistsService } from './wishlists.service';
import { WishlistProductParamDto } from './dto/wishlist-product-param.dto';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  /*
   * POST /api/wishlist/:productId
   */
  @Post(':productId')
  add(@Req() request: any, @Param() params: WishlistProductParamDto) {
    return this.wishlistsService.add(request.user.id, params.productId);
  }

  /*
   * GET /api/wishlist
   */
  @Get()
  findAll(@Req() request: any) {
    return this.wishlistsService.findAll(request.user.id);
  }

  /*
   * GET /api/wishlist/:productId/check
   */
  @Get(':productId/check')
  check(@Req() request: any, @Param() params: WishlistProductParamDto) {
    return this.wishlistsService.check(request.user.id, params.productId);
  }

  /*
   * DELETE /api/wishlist/:productId
   */
  @Delete(':productId')
  remove(@Req() request: any, @Param() params: WishlistProductParamDto) {
    return this.wishlistsService.remove(request.user.id, params.productId);
  }
}
