import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order } from './entities/order.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { EmailsService } from '../emails/emails.service';
import { OrderCancellationService } from './order-cancellation.service';

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly emailsService: EmailsService,
    private readonly orderCancellationService: OrderCancellationService,
  ) {}

  async findAll(query: AdminOrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const orderRepository = this.dataSource.getRepository(Order);

    const queryBuilder = orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .where('1 = 1');

    if (query.status) {
      queryBuilder.andWhere('order.status = :status', {
        status: query.status,
      });
    }

    if (query.paymentStatus) {
      queryBuilder.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    }

    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;

      queryBuilder.andWhere(
        `(
        order.orderNumber LIKE :keyword
        OR user.email LIKE :keyword
        OR user.fullName LIKE :keyword
        OR user.phone LIKE :keyword
      )`,
        {
          keyword,
        },
      );
    }

    if (query.createdFrom) {
      queryBuilder.andWhere('order.createdAt >= :createdFrom', {
        createdFrom: new Date(`${query.createdFrom}T00:00:00+09:00`),
      });
    }

    if (query.createdTo) {
      queryBuilder.andWhere('order.createdAt <= :createdTo', {
        createdTo: new Date(`${query.createdTo}T23:59:59.999+09:00`),
      });
    }

    if (query.deliveryFrom) {
      queryBuilder.andWhere('order.deliveryDate >= :deliveryFrom', {
        deliveryFrom: query.deliveryFrom,
      });
    }

    if (query.deliveryTo) {
      queryBuilder.andWhere('order.deliveryDate <= :deliveryTo', {
        deliveryTo: query.deliveryTo,
      });
    }

    const sortMap: Record<AdminOrderQueryDto['sortBy'], string> = {
      createdAt: 'order.createdAt',
      updatedAt: 'order.updatedAt',
      deliveryDate: 'order.deliveryDate',
      totalAmount: 'order.totalAmount',
      orderNumber: 'order.orderNumber',
    };

    queryBuilder
      .orderBy(sortMap[query.sortBy ?? 'createdAt'], query.sortOrder ?? 'DESC')
      .skip(skip)
      .take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      items: orders.map((order) => this.buildOrderSummary(order)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(orderId: string) {
    const orderRepository = this.dataSource.getRepository(Order);

    const order = await orderRepository.findOne({
      where: {
        id: orderId,
      },
      relations: {
        user: true,
        items: true,
        coupon: true,
        deliveryAddress: true,
        payments: true,
        statusHistories: {
          changedByUser: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return this.buildOrderDetail(order);
  }

  async updateStatus(
    adminUserId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const updatedOrderId = await this.dataSource.transaction(
      async (manager) => {
        const orderRepository = manager.getRepository(Order);
        const historyRepository = manager.getRepository(OrderStatusHistory);

        const order = await orderRepository.findOne({
          where: {
            id: orderId,
          },
          relations: {
            items: true,
          },
          lock: {
            mode: 'pessimistic_write',
          },
        });

        if (!order) {
          throw new NotFoundException('Không tìm thấy đơn hàng');
        }

        if (order.status === dto.status) {
          throw new ConflictException('Đơn hàng đã ở trạng thái được yêu cầu');
        }

        this.validateStatusTransition(order.status, dto.status);

        this.validatePaymentStatus(order, dto.status);

        if (dto.status === OrderStatus.CANCELLED) {
          await this.orderCancellationService.cancel(manager, {
            order,
            changedByUserId: adminUserId,
            reason: dto.note,
            allowedStatuses: [
              OrderStatus.PENDING,
              OrderStatus.CONFIRMED,
              OrderStatus.PREPARING,
            ],
          });
        } else {
          const previousStatus = order.status;

          order.status = dto.status;
          this.applyStatusTimestamp(order, dto.status);
          await orderRepository.save(order);

          const history = historyRepository.create({
            orderId: order.id,
            fromStatus: previousStatus,
            toStatus: dto.status,
            changedByUserId: adminUserId,
            note: dto.note?.trim() || null,
          });

          await historyRepository.save(history);
        }

        const notificationContent = this.getStatusNotification(
          order,
          dto.status,
        );

        await this.notificationsService.createWithManager(manager, {
          userId: order.userId,
          type:
            dto.status === OrderStatus.CANCELLED
              ? NotificationType.ORDER_CANCELLED
              : NotificationType.ORDER_STATUS_CHANGED,
          title: notificationContent.title,
          message: notificationContent.message,
          referenceType: 'ORDER',
          referenceId: order.id,
        });

        return order.id;
      },
    );

    const updatedOrder = await this.dataSource.getRepository(Order).findOne({
      where: {
        id: updatedOrderId,
      },
      relations: {
        user: true,
      },
    });

    if (!updatedOrder) {
      throw new NotFoundException('Không thể lấy đơn hàng sau khi cập nhật');
    }

    const emailContent = this.getStatusEmailContent(
      updatedOrder,
      updatedOrder.status,
    );

    await this.emailsService.sendOrderStatusChangedEmail({
      to: updatedOrder.user.email,
      fullName: updatedOrder.user.fullName,
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      statusLabel: emailContent.title,
      message: emailContent.message,
    });

    return this.findOne(updatedOrderId);
  }

  private getStatusEmailContent(
    order: Order,
    status: OrderStatus,
  ): {
    title: string;
    message: string;
  } {
    switch (status) {
      case OrderStatus.CONFIRMED:
        return {
          title: 'Đơn hàng đã được xác nhận',
          message: `Đơn hàng ${order.orderNumber} đã được xác nhận.`,
        };

      case OrderStatus.PREPARING:
        return {
          title: 'Đơn hàng đang được chuẩn bị',
          message: `Đơn hàng ${order.orderNumber} đang được chuẩn bị.`,
        };

      case OrderStatus.SHIPPED:
        return {
          title: 'Đơn hàng đang được giao',
          message: `Đơn hàng ${order.orderNumber} đã được giao cho đơn vị vận chuyển.`,
        };

      case OrderStatus.DELIVERED:
        return {
          title: 'Đơn hàng đã được giao',
          message: `Đơn hàng ${order.orderNumber} đã được giao thành công.`,
        };

      case OrderStatus.CANCELLED:
        return {
          title: 'Đơn hàng đã bị hủy',
          message: `Đơn hàng ${order.orderNumber} đã bị hủy.`,
        };

      default:
        return {
          title: 'Trạng thái đơn hàng đã thay đổi',
          message: `Đơn hàng ${order.orderNumber} đã được cập nhật trạng thái.`,
        };
    }
  }

  private getStatusNotification(
    order: Order,
    status: OrderStatus,
  ): {
    title: string;
    message: string;
  } {
    switch (status) {
      case OrderStatus.CONFIRMED:
        return {
          title: 'Đơn hàng đã được xác nhận',
          message: `Đơn hàng ${order.orderNumber} ` + 'đã được xác nhận.',
        };

      case OrderStatus.PREPARING:
        return {
          title: 'Đơn hàng đang được chuẩn bị',
          message: `Đơn hàng ${order.orderNumber} ` + 'đang được chuẩn bị.',
        };

      case OrderStatus.SHIPPED:
        return {
          title: 'Đơn hàng đang được giao',
          message:
            `Đơn hàng ${order.orderNumber} ` +
            'đã được giao cho đơn vị vận chuyển.',
        };

      case OrderStatus.DELIVERED:
        return {
          title: 'Đơn hàng đã được giao',
          message:
            `Đơn hàng ${order.orderNumber} ` + 'đã được giao thành công.',
        };

      case OrderStatus.CANCELLED:
        return {
          title: 'Đơn hàng đã bị hủy',
          message: `Đơn hàng ${order.orderNumber} ` + 'đã bị hủy.',
        };

      default:
        return {
          title: 'Trạng thái đơn hàng đã thay đổi',
          message:
            `Đơn hàng ${order.orderNumber} ` +
            `đã chuyển sang trạng thái ${status}.`,
        };
    }
  }

  private validateStatusTransition(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ): void {
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],

      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],

      [OrderStatus.PREPARING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],

      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],

      [OrderStatus.DELIVERED]: [],

      [OrderStatus.CANCELLED]: [],
    };

    const allowedNextStatuses = allowedTransitions[currentStatus] ?? [];

    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new ConflictException(
        `Không thể chuyển trạng thái từ ${currentStatus} sang ${nextStatus}`,
      );
    }
  }

  private validatePaymentStatus(order: Order, nextStatus: OrderStatus): void {
    if (
      nextStatus === OrderStatus.CONFIRMED &&
      order.paymentStatus !== PaymentStatus.PAID
    ) {
      throw new ConflictException(
        'Không thể xác nhận đơn hàng chưa thanh toán',
      );
    }
  }

  private applyStatusTimestamp(order: Order, status: OrderStatus): void {
    const now = new Date();

    switch (status) {
      case OrderStatus.CONFIRMED:
        order.confirmedAt = now;
        break;

      case OrderStatus.PREPARING:
        order.preparingAt = now;
        break;

      case OrderStatus.SHIPPED:
        order.shippedAt = now;
        break;

      case OrderStatus.DELIVERED:
        order.deliveredAt = now;
        break;

      case OrderStatus.CANCELLED:
        order.cancelledAt = now;
        break;
    }
  }

  private buildOrderSummary(order: Order) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,

      customer: {
        id: order.user.id,
        email: order.user.email,
        fullName: order.user.fullName,
        phone: order.user.phone,
      },

      status: order.status,
      paymentStatus: order.paymentStatus,

      totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),

      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      currency: order.currencyCode,

      coupon: order.couponCode
        ? {
            id: order.couponId,
            code: order.couponCode,
            name: order.couponName,
          }
        : null,

      deliveryDate: order.deliveryDate,
      deliveryTimeSlot: order.deliveryTimeSlot,

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private buildOrderDetail(order: Order) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,

      user: {
        id: order.user.id,
        email: order.user.email,
        fullName: order.user.fullName,
        phone: order.user.phone,
      },

      status: order.status,
      paymentStatus: order.paymentStatus,

      timestamps: {
        confirmedAt: order.confirmedAt,
        preparingAt: order.preparingAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
        inventoryRestoredAt: order.inventoryRestoredAt,
      },

      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        thumbnailUrl: item.thumbnailUrl,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
      })),

      deliveryAddress: order.deliveryAddress,

      delivery: {
        date: order.deliveryDate,
        timeSlot: order.deliveryTimeSlot,
      },

      coupon: order.couponCode
        ? {
            id: order.couponId,
            code: order.couponCode,
            name: order.couponName,
            discountAmount: Number(order.discountAmount),
          }
        : null,

      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      currency: order.currencyCode,

      payments: order.payments.map((payment) => ({
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        amount: Number(payment.amount),
        paidAt: payment.paidAt,
      })),

      statusHistories: [...order.statusHistories]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((history) => ({
          id: history.id,
          fromStatus: history.fromStatus,
          toStatus: history.toStatus,
          changedBy: history.changedByUser?.fullName ?? null,
          note: history.note,
          createdAt: history.createdAt,
        })),

      note: order.note,

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
