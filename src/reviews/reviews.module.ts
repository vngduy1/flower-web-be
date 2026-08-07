import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';

import { AdminReviewsController } from './admin-reviews.controller';
import { ProductReview } from './entities/product-review.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductReview, Product, Order, OrderItem]),
    NotificationsModule,
  ],
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
