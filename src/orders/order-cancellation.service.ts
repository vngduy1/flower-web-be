import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { CouponsService } from '../coupons/coupons.service';
import { DeliveryAvailabilityService } from '../deliveries/delivery-availability.service';
import { InventoryHistory } from '../inventories/entities/inventory-history.entity';
import { Inventory } from '../inventories/entities/inventory.entity';
import { InventoryChangeType } from '../inventories/enums/inventory-change-type.enum';

import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentStatus } from './enums/payment-status.enum';

export interface CancelOrderCommand {
  order: Order;
  changedByUserId: string;
  reason?: string;
  allowedStatuses: readonly OrderStatus[];
}

@Injectable()
export class OrderCancellationService {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly deliveryAvailabilityService: DeliveryAvailabilityService,
  ) {}

  async cancel(
    manager: EntityManager,
    command: CancelOrderCommand,
  ): Promise<Order> {
    const { order } = command;

    if (order.status === OrderStatus.CANCELLED) {
      throw new ConflictException('Đơn hàng đã bị hủy trước đó');
    }

    if (!command.allowedStatuses.includes(order.status)) {
      throw new ConflictException(
        'Trạng thái đơn hàng hiện tại không cho phép hủy',
      );
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new ConflictException(
        'Đơn hàng đã thanh toán không thể hủy khi chưa có quy trình hoàn tiền',
      );
    }

    const previousStatus = order.status;

    if (!order.inventoryRestoredAt) {
      await this.restoreInventory(manager, order, command.changedByUserId);
      order.inventoryRestoredAt = new Date();
    }

    await this.couponsService.reverseCouponUsage(manager, order.id);

    if (!order.deliveryCapacityReleasedAt) {
      if (!order.deliveryTimeSlotId) {
        throw new ConflictException(
          'Đơn hàng không có thông tin khung giờ để giải phóng sức chứa giao hàng',
        );
      }

      await this.deliveryAvailabilityService.releaseCapacity(
        manager,
        order.deliveryDate,
        order.deliveryTimeSlotId,
      );
      order.deliveryCapacityReleasedAt = new Date();
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();

    await manager.getRepository(Order).save(order);

    const history = manager.getRepository(OrderStatusHistory).create({
      orderId: order.id,
      fromStatus: previousStatus,
      toStatus: OrderStatus.CANCELLED,
      changedByUserId: command.changedByUserId,
      note: command.reason?.trim() || null,
    });

    await manager.getRepository(OrderStatusHistory).save(history);

    return order;
  }

  private async restoreInventory(
    manager: EntityManager,
    order: Order,
    changedByUserId: string,
  ): Promise<void> {
    const quantitiesByProduct = new Map<string, number>();

    for (const item of order.items) {
      if (!item.productId) {
        throw new ConflictException(
          `Không thể hoàn tồn kho cho sản phẩm ${item.productName}`,
        );
      }

      quantitiesByProduct.set(
        item.productId,
        (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const productIds = [...quantitiesByProduct.keys()].sort((left, right) => {
      const leftId = BigInt(left);
      const rightId = BigInt(right);

      return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
    });

    const inventoryRepository = manager.getRepository(Inventory);
    const historyRepository = manager.getRepository(InventoryHistory);

    for (const productId of productIds) {
      const inventory = await inventoryRepository.findOne({
        where: { productId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException(
          `Không tìm thấy tồn kho của sản phẩm ${productId}`,
        );
      }

      if (!inventory.isStockManaged) {
        continue;
      }

      const quantityBefore = inventory.stockQuantity;
      const reservedBefore = inventory.reservedQuantity;
      const quantity = quantitiesByProduct.get(productId) ?? 0;

      inventory.stockQuantity += quantity;
      await inventoryRepository.save(inventory);

      const history = historyRepository.create({
        inventoryId: inventory.id,
        productId,
        changeType: InventoryChangeType.ORDER_CANCELLED,
        quantityBefore,
        quantityChange: quantity,
        quantityAfter: inventory.stockQuantity,
        reservedBefore,
        reservedAfter: inventory.reservedQuantity,
        reason: `Hoàn tồn kho do hủy đơn ${order.orderNumber}`,
        changedByUserId,
      });

      await historyRepository.save(history);
    }
  }
}
