import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CouponsService } from '../coupons/coupons.service';
import { DeliveryAvailabilityService } from '../deliveries/delivery-availability.service';
import { EmailsService } from '../emails/emails.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { OrderCancellationService } from './order-cancellation.service';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: {} },
        { provide: DeliveryAvailabilityService, useValue: {} },
        { provide: CouponsService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: EmailsService, useValue: {} },
        { provide: OrderCancellationService, useValue: {} },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
