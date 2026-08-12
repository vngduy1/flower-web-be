import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EmailsService } from '../emails/emails.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: EmailsService, useValue: {} },
        { provide: DataSource, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) =>
              key === 'DEPLOYMENT_ENV' ? 'development' : defaultValue,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects mock settlement in production before touching the database', async () => {
    const productionService = new PaymentsService(
      {} as never,
      {} as never,
      {} as never,
      {
        get: jest.fn((key: string, defaultValue?: string) =>
          key === 'DEPLOYMENT_ENV' ? 'production' : defaultValue,
        ),
      } as unknown as ConfigService,
      {} as never,
    );

    await expect(productionService.confirm('1', '1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(productionService.fail('1', '1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
