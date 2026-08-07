import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Inventory } from '../inventories/entities/inventory.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { ProductReview } from '../reviews/entities/product-review.entity';
import { User } from '../users/entities/user.entity';

import { AdminDashboardController } from './admin-dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ProductImage } from '../product-images/entities/product-image.entity';
import { Notification } from '../notifications/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      User,
      Product,
      Inventory,
      ProductImage,
      ProductReview,
      Notification,
    ]),
  ],
  controllers: [AdminDashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
