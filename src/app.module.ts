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
import { GiftMessagesModule } from './gift-messages/gift-messages.module';
import {
  getDeploymentEnvironment,
  readBoolean,
  readPort,
  validateEnvironment,
} from './common/environment';
import { HealthModule } from './common/health.module';
import { LifecycleService } from './common/lifecycle.service';
import { AddOrderIdempotency1786330000000 } from './migrations/1786330000000-AddOrderIdempotency';
import { AddEmailVerification1786930000000 } from './migrations/1786930000000-add-email-verification';
import { CreateOccasions1786970000000 } from './migrations/1786970000000-CreateOccasions';
import { CreateGiftMessages1787070000000 } from './migrations/1787070000000-CreateGiftMessages';
import { OccasionsModule } from './occasions/occasions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: false,
      validate: validateEnvironment,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const deploymentEnvironment = getDeploymentEnvironment(configService);
        const synchronize = readBoolean(
          configService.get<string>('DB_SYNCHRONIZE'),
          false,
        );
        const dropSchema = readBoolean(
          configService.get<string>('DB_DROP_SCHEMA'),
          false,
        );

        if (
          ['staging', 'production'].includes(deploymentEnvironment) &&
          synchronize
        ) {
          throw new Error(
            'Database synchronization is forbidden in staging/production',
          );
        }

        return {
          type: 'mysql' as const,
          host: configService.getOrThrow<string>('DB_HOST'),
          port: readPort(configService.get<string>('DB_PORT'), 'DB_PORT', 3306),
          username: configService.getOrThrow<string>('DB_USERNAME'),
          password: configService.getOrThrow<string>('DB_PASSWORD'),
          database: configService.getOrThrow<string>('DB_DATABASE'),
          autoLoadEntities: true,
          synchronize,
          dropSchema,
          migrationsRun: false,
          migrations: [
            AddEmailVerification1786930000000,
            AddOrderIdempotency1786330000000,
            CreateOccasions1786970000000,
            CreateGiftMessages1787070000000,
          ],
          charset: 'utf8mb4',
          timezone: '+09:00',
          logging: readBoolean(configService.get<string>('DB_LOGGING'), false),
          retryAttempts: 10,
          retryDelay: 3000,
        };
      },
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
    HealthModule,
    OccasionsModule,
    GiftMessagesModule,
  ],
  controllers: [AppController, CheckoutController, PaymentsController],
  providers: [AppService, CheckoutService, LifecycleService],
})
export class AppModule {}
