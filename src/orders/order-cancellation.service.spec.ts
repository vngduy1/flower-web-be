/* eslint-disable @typescript-eslint/unbound-method */
import { ConflictException } from '@nestjs/common';
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
import { OrderCancellationService } from './order-cancellation.service';

describe('OrderCancellationService', () => {
  const createOrder = (): Order =>
    ({
      id: '41',
      orderNumber: 'ORD-41',
      userId: '7',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      deliveryDate: '2026-08-12',
      deliveryTimeSlotId: '3',
      inventoryRestoredAt: null,
      deliveryCapacityReleasedAt: null,
      cancelledAt: null,
      items: [
        {
          productId: '9',
          productName: 'Rose',
          quantity: 3,
        },
      ],
    }) as Order;

  function createFixture() {
    const inventory = {
      id: '5',
      productId: '9',
      stockQuantity: 10,
      reservedQuantity: 2,
      isStockManaged: true,
    } as Inventory;
    const inventoryRepository = {
      findOne: jest.fn().mockResolvedValue(inventory),
      save: jest.fn().mockImplementation((value: Inventory) => value),
    };
    const inventoryHistoryRepository = {
      create: jest.fn().mockImplementation((value: InventoryHistory) => value),
      save: jest.fn().mockImplementation((value: InventoryHistory) => value),
    };
    const orderRepository = {
      save: jest.fn().mockImplementation((value: Order) => value),
    };
    const statusHistoryRepository = {
      create: jest
        .fn()
        .mockImplementation((value: OrderStatusHistory) => value),
      save: jest.fn().mockImplementation((value: OrderStatusHistory) => value),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Inventory) return inventoryRepository;
        if (entity === InventoryHistory) return inventoryHistoryRepository;
        if (entity === Order) return orderRepository;
        if (entity === OrderStatusHistory) return statusHistoryRepository;
        throw new Error('Unexpected repository');
      }),
    } as unknown as EntityManager;
    const couponsService = {
      reverseCouponUsage: jest.fn().mockResolvedValue(true),
    } as unknown as CouponsService;
    const deliveryAvailabilityService = {
      releaseCapacity: jest.fn().mockResolvedValue({}),
    } as unknown as DeliveryAvailabilityService;

    return {
      service: new OrderCancellationService(
        couponsService,
        deliveryAvailabilityService,
      ),
      manager,
      inventory,
      inventoryRepository,
      inventoryHistoryRepository,
      orderRepository,
      statusHistoryRepository,
      couponsService,
      deliveryAvailabilityService,
    };
  }

  it('restores stock and all cancellation bookkeeping in one call', async () => {
    const fixture = createFixture();
    const order = createOrder();

    await fixture.service.cancel(fixture.manager, {
      order,
      changedByUserId: '7',
      reason: 'Changed plans',
      allowedStatuses: [OrderStatus.PENDING, OrderStatus.CONFIRMED],
    });

    expect(fixture.inventory.stockQuantity).toBe(13);
    expect(fixture.inventory.reservedQuantity).toBe(2);
    expect(fixture.inventoryRepository.findOne).toHaveBeenCalledWith({
      where: { productId: '9' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(fixture.inventoryHistoryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        changeType: InventoryChangeType.ORDER_CANCELLED,
        quantityBefore: 10,
        quantityChange: 3,
        quantityAfter: 13,
        reservedBefore: 2,
        reservedAfter: 2,
      }),
    );
    expect(fixture.couponsService.reverseCouponUsage).toHaveBeenCalledTimes(1);
    expect(
      fixture.deliveryAvailabilityService.releaseCapacity,
    ).toHaveBeenCalledTimes(1);
    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(order.inventoryRestoredAt).toBeInstanceOf(Date);
    expect(order.deliveryCapacityReleasedAt).toBeInstanceOf(Date);
    expect(fixture.orderRepository.save).toHaveBeenCalledTimes(1);
    expect(fixture.statusHistoryRepository.save).toHaveBeenCalledTimes(1);
  });

  it('rejects paid orders before changing inventory or capacity', async () => {
    const fixture = createFixture();
    const order = createOrder();
    order.paymentStatus = PaymentStatus.PAID;

    await expect(
      fixture.service.cancel(fixture.manager, {
        order,
        changedByUserId: '7',
        allowedStatuses: [OrderStatus.PENDING],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(fixture.inventoryRepository.findOne).not.toHaveBeenCalled();
    expect(
      fixture.deliveryAvailabilityService.releaseCapacity,
    ).not.toHaveBeenCalled();
  });

  it('rejects a repeated cancellation without repeating side effects', async () => {
    const fixture = createFixture();
    const order = createOrder();
    order.status = OrderStatus.CANCELLED;

    await expect(
      fixture.service.cancel(fixture.manager, {
        order,
        changedByUserId: '7',
        allowedStatuses: [OrderStatus.PENDING],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(fixture.inventoryRepository.save).not.toHaveBeenCalled();
    expect(fixture.couponsService.reverseCouponUsage).not.toHaveBeenCalled();
  });
});
