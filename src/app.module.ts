import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { ProductImagesModule } from './product-images/product-images.module';
import { InventoriesModule } from './inventories/inventories.module';
import { CartsModule } from './carts/carts.module';
import { AddressesModule } from './addresses/addresses.module';
import { CheckoutController } from './checkout/checkout.controller';
import { CheckoutService } from './checkout/checkout.service';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsModule } from './payments/payments.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { CouponsModule } from './coupons/coupons.module';
import { WishlistsModule } from './wishlists/wishlists.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmailsModule } from './emails/emails.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',

        host: configService.getOrThrow<string>('DB_HOST'),
        port: Number(configService.getOrThrow<string>('DB_PORT')),
        username: configService.getOrThrow<string>('DB_USERNAME'),
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.getOrThrow<string>('DB_DATABASE'),

        autoLoadEntities: true,

        // Chỉ thuận tiện trong giai đoạn phát triển ban đầu.
        // Sau này sẽ chuyển sang migration.
        synchronize: true,

        charset: 'utf8mb4',
        timezone: '+09:00',

        logging: true,
      }),
    }),

    RolesModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    ProductImagesModule,
    InventoriesModule,
    CartsModule,
    AddressesModule,
    CheckoutModule,
    OrdersModule,
    PaymentsModule,
    DeliveriesModule,
    CouponsModule,
    WishlistsModule,
    ReviewsModule,
    NotificationsModule,
    DashboardModule,
    EmailsModule,
  ],
  controllers: [AppController, CheckoutController, PaymentsController],
  providers: [AppService, CheckoutService],
})
export class AppModule {}
