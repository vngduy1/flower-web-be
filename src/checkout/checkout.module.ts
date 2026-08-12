import { Module } from '@nestjs/common';

import { AddressesModule } from '../addresses/addresses.module';
import { CartsModule } from '../carts/carts.module';

import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { DeliveriesModule } from '../deliveries/deliveries.module';

@Module({
  imports: [CartsModule, AddressesModule, DeliveriesModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
