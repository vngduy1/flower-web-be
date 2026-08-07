import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Product } from '../products/entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductImagesController } from './product-images.controller';
import { ProductImagesService } from './product-images.service';
import { ProductImageProcessorService } from './services/product-image-processor.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductImage, Product])],
  controllers: [ProductImagesController],
  providers: [ProductImagesService, ProductImageProcessorService, RolesGuard],
  exports: [ProductImagesService],
})
export class ProductImagesModule {}
