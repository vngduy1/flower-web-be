import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Inventory } from '../inventories/entities/inventory.entity';
import { ProductImage } from '../product-images/entities/product-image.entity';
import { Product } from '../products/entities/product.entity';
import { CartItem } from './entities/cart-item.entity';
import { Cart } from './entities/cart.entity';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cart,
      CartItem,
      Product,
      Inventory,
      ProductImage,
    ]),
  ],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}
