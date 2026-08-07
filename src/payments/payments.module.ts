import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from '../orders/entities/order.entity';

import { Payment } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order]),
    NotificationsModule,
    EmailsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
