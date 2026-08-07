import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductImage } from '../product-images/entities/product-image.entity';
import { Product } from '../products/entities/product.entity';

import { WishlistItem } from './entities/wishlist-item.entity';
import { WishlistsController } from './wishlists.controller';
import { WishlistsService } from './wishlists.service';

@Module({
  imports: [TypeOrmModule.forFeature([WishlistItem, Product, ProductImage])],
  controllers: [WishlistsController],
  providers: [WishlistsService],
  exports: [WishlistsService],
})
export class WishlistsModule {}
