import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Category } from '../categories/entities/category.entity';
import { Product } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category])],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService, AdminProductsService, RolesGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
