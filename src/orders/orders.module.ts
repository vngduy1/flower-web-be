import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { OrderAddress } from './entities/order-address.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Order } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CartsModule } from '../carts/carts.module';
import { AddressesModule } from '../addresses/addresses.module';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { CouponsModule } from '../coupons/coupons.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailsModule } from '../emails/emails.module';
import { OrderCancellationService } from './order-cancellation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderAddress,
      OrderStatusHistory,
    ]),
    // Các module hiện tại của bạn
    CartsModule,
    AddressesModule,
    DeliveriesModule,
    CouponsModule,
    NotificationsModule,
    EmailsModule,
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, AdminOrdersService, OrderCancellationService],
  exports: [OrdersService, AdminOrdersService],
})
export class OrdersModule {}
