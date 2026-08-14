import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';

import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { PaymentStatus } from '../orders/enums/payment-status.enum';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';
import { PaymentRecordStatus } from './enums/payment-record-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { EmailsService } from '../emails/emails.service';
import { ConfigService } from '@nestjs/config';
import { getDeploymentEnvironment } from '../common/environment';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,

    private readonly notificationsService: NotificationsService,

    private readonly emailsService: EmailsService,

    private readonly configService: ConfigService,

    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, createPaymentDto: CreatePaymentDto) {
    const payment = await this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const paymentRepository = manager.getRepository(Payment);

      const order = await orderRepository.findOne({
        where: {
          id: createPaymentDto.orderId,
          userId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new ConflictException('Không thể thanh toán đơn hàng đã bị hủy');
      }

      if (order.paymentStatus === PaymentStatus.PAID) {
        throw new ConflictException('Đơn hàng đã được thanh toán');
      }

      const pendingPayment = await paymentRepository.findOne({
        where: {
          orderId: order.id,
          status: PaymentRecordStatus.PENDING,
        },
      });

      if (pendingPayment) {
        throw new ConflictException(
          'Đơn hàng đang có một yêu cầu thanh toán chờ xử lý',
        );
      }

      const createdPayment = paymentRepository.create({
        paymentNumber: this.generatePaymentNumber(),
        orderId: order.id,
        paymentMethod: createPaymentDto.paymentMethod,
        status: PaymentRecordStatus.PENDING,
        amount: order.totalAmount,
        currencyCode: order.currencyCode,
        providerPaymentId: null,
        failureReason: null,
        paidAt: null,
        failedAt: null,
        refundedAt: null,
      });

      return paymentRepository.save(createdPayment);
    });

    return this.buildPaymentResponse(payment);
  }

  async findOne(userId: string, paymentId: string) {
    const payment = await this.paymentsRepository.findOne({
      where: {
        id: paymentId,
      },
      relations: {
        order: true,
      },
    });

    if (!payment || payment.order.userId !== userId) {
      throw new NotFoundException('Không tìm thấy thông tin thanh toán');
    }

    return this.buildPaymentResponse(payment);
  }

  async confirm(userId: string, paymentId: string) {
    this.assertMockSettlementAllowed();

    const paymentIdAfterConfirm = await this.dataSource.transaction(
      async (manager) => {
        const paymentRepository = manager.getRepository(Payment);

        const orderRepository = manager.getRepository(Order);

        const payment = await paymentRepository.findOne({
          where: {
            id: paymentId,
          },
          relations: {
            order: true,
          },
          lock: {
            mode: 'pessimistic_write',
          },
        });

        if (!payment || payment.order.userId !== userId) {
          throw new NotFoundException('Không tìm thấy thông tin thanh toán');
        }

        if (payment.status !== PaymentRecordStatus.PENDING) {
          throw new ConflictException(
            'Thanh toán này không còn ở trạng thái chờ xử lý',
          );
        }

        const order = await orderRepository.findOne({
          where: {
            id: payment.orderId,
            userId,
          },
          lock: {
            mode: 'pessimistic_write',
          },
        });

        if (!order) {
          throw new NotFoundException('Không tìm thấy đơn hàng');
        }

        if (order.status === OrderStatus.CANCELLED) {
          throw new ConflictException(
            'Không thể xác nhận thanh toán cho đơn hàng đã hủy',
          );
        }

        if (order.paymentStatus === PaymentStatus.PAID) {
          throw new ConflictException('Đơn hàng đã được thanh toán trước đó');
        }

        if (order.status !== OrderStatus.PENDING) {
          throw new ConflictException(
            'Trạng thái đơn hàng không cho phép xác nhận thanh toán',
          );
        }

        const paidAt = new Date();

        payment.status = PaymentRecordStatus.PAID;

        payment.providerPaymentId = `MOCK-${randomUUID()}`;

        payment.paidAt = paidAt;
        payment.failureReason = null;

        order.paymentStatus = PaymentStatus.PAID;

        order.status = OrderStatus.CONFIRMED;

        order.confirmedAt = paidAt;

        await orderRepository.save(order);

        const savedPayment = await paymentRepository.save(payment);

        await this.notificationsService.createWithManager(manager, {
          userId: order.userId,
          type: NotificationType.PAYMENT_SUCCESS,
          title: 'Thanh toán thành công',
          message:
            `Đơn hàng ${order.orderNumber} ` + 'đã được thanh toán thành công.',
          referenceType: 'ORDER',
          referenceId: order.id,
        });

        await this.notificationsService.createAdminNotificationsWithManager(
          manager,
          {
            type: NotificationType.PAYMENT_SUCCESS,
            title: '注文の支払いが完了しました',
            message: `注文 ${order.orderNumber} の支払いが完了しました。`,
            referenceType: 'ORDER',
            referenceId: order.id,
          },
        );

        return savedPayment.id;
      },
    );

    const confirmedPayment = await this.dataSource
      .getRepository(Payment)
      .findOne({
        where: {
          id: paymentIdAfterConfirm,
        },
        relations: {
          order: {
            user: true,
          },
        },
      });

    if (!confirmedPayment) {
      throw new NotFoundException(
        'Không thể lấy thông tin thanh toán sau khi xác nhận',
      );
    }

    await this.emailsService.sendPaymentSuccessEmail({
      to: confirmedPayment.order.user.email,
      fullName: confirmedPayment.order.user.fullName,
      orderId: confirmedPayment.order.id,
      orderNumber: confirmedPayment.order.orderNumber,
      amount: Number(confirmedPayment.amount),
      currencyCode: confirmedPayment.currencyCode,
    });

    return this.buildPaymentResponse(confirmedPayment);
  }

  async fail(userId: string, paymentId: string) {
    this.assertMockSettlementAllowed();

    const payment = await this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(Payment);

      const payment = await paymentRepository.findOne({
        where: {
          id: paymentId,
        },
        relations: {
          order: true,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!payment || payment.order.userId !== userId) {
        throw new NotFoundException('Không tìm thấy thông tin thanh toán');
      }

      if (payment.status !== PaymentRecordStatus.PENDING) {
        throw new ConflictException(
          'Thanh toán này không còn ở trạng thái chờ xử lý',
        );
      }

      payment.status = PaymentRecordStatus.FAILED;
      payment.failureReason = 'Thanh toán mock thất bại';
      payment.failedAt = new Date();

      return paymentRepository.save(payment);
    });

    return this.buildPaymentResponse(payment);
  }

  private buildPaymentResponse(payment: Payment) {
    return {
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      orderId: payment.orderId,

      paymentMethod: payment.paymentMethod,
      status: payment.status,

      amount: Number(payment.amount),
      currency: payment.currencyCode,

      providerPaymentId: payment.providerPaymentId,
      failureReason: payment.failureReason,

      paidAt: payment.paidAt,
      failedAt: payment.failedAt,
      refundedAt: payment.refundedAt,

      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private assertMockSettlementAllowed(): void {
    const environment = getDeploymentEnvironment(this.configService);

    if (environment === 'staging' || environment === 'production') {
      throw new ConflictException(
        'Xác nhận thanh toán mô phỏng không được phép trong môi trường này',
      );
    }
  }

  private generatePaymentNumber(): string {
    const date = new Date();

    const datePart = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('');

    const randomPart = randomUUID()
      .replace(/-/g, '')
      .slice(0, 12)
      .toUpperCase();

    return `PAY-${datePart}-${randomPart}`;
  }
}
