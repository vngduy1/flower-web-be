/* eslint-disable @typescript-eslint/unbound-method */
import { DataSource, EntityManager, FindOperator, Repository } from 'typeorm';

import { UserAddress } from '../addresses/entities/user-address.entity';
import { CartItem } from '../carts/entities/cart-item.entity';
import { Cart } from '../carts/entities/cart.entity';
import { CouponsService } from '../coupons/coupons.service';
import { DeliveryAvailabilityService } from '../deliveries/delivery-availability.service';
import { EmailsService } from '../emails/emails.service';
import { Inventory } from '../inventories/entities/inventory.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ProductImage } from '../product-images/entities/product-image.entity';
import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../products/enums/product-status.enum';

import { OrderAddress } from './entities/order-address.entity';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { OrderCancellationService } from './order-cancellation.service';
import { OrdersService } from './orders.service';

describe('OrdersService concurrency and idempotency', () => {
  it('locks inventory deterministically and deletes only the ordered cart rows', async () => {
    const cart = { id: '6', userId: '7' } as Cart;
    const cartItems = [
      {
        id: '101',
        cartId: '6',
        productId: '10',
        quantity: 1,
        unitPrice: '1000',
      },
      { id: '102', cartId: '6', productId: '2', quantity: 2, unitPrice: '500' },
    ] as CartItem[];
    const products = [
      {
        id: '10',
        productCode: 'P-10',
        name: 'Ten',
        basePrice: '1000',
        salePrice: null,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
      {
        id: '2',
        productCode: 'P-2',
        name: 'Two',
        basePrice: '500',
        salePrice: null,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
    ] as Product[];
    const inventories = [
      {
        id: '20',
        productId: '10',
        stockQuantity: 10,
        reservedQuantity: 0,
        isStockManaged: true,
      },
      {
        id: '21',
        productId: '2',
        stockQuantity: 10,
        reservedQuantity: 0,
        isStockManaged: true,
      },
    ] as Inventory[];
    const address = {
      id: '4',
      userId: '7',
      recipientName: 'Customer',
      recipientPhone: '0900000000',
      postalCode: '1000001',
      prefecture: 'Tokyo',
      city: 'Chiyoda',
      addressLine1: '1-1',
      addressLine2: null,
    } as UserAddress;
    const savedOrder = {
      id: '50',
      orderNumber: 'ORD-50',
      userId: '7',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      subtotal: '2000.00',
      deliveryFee: '500.00',
      discountAmount: '0.00',
      totalAmount: '2500.00',
      currencyCode: 'JPY',
      deliveryDate: '2099-08-15',
      deliveryTimeSlotId: '3',
      deliveryTimeSlot: 'Morning',
      note: null,
    } as unknown as Order;
    const itemQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(cartItems),
    };
    let deletedCartItems:
      { cartId: string; id: FindOperator<string> } | undefined;
    const cartItemRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(itemQueryBuilder),
      delete: jest
        .fn()
        .mockImplementation(
          (criteria: { cartId: string; id: FindOperator<string> }) => {
            deletedCartItems = criteria;
            return Promise.resolve({ affected: 2 });
          },
        ),
    };
    const inventoryLockOrder: string[] = [];
    const inventoryRepository = {
      find: jest.fn().mockResolvedValue(inventories),
      findOne: jest
        .fn()
        .mockImplementation(({ where }: { where: { productId: string } }) => {
          inventoryLockOrder.push(where.productId);

          return Promise.resolve(
            inventories.find(
              (inventory) => inventory.productId === where.productId,
            ),
          );
        }),
      save: jest.fn().mockImplementation((value: Inventory) => value),
    };
    const orderRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((value: Order) => Object.assign(savedOrder, value)),
      save: jest.fn().mockResolvedValue(savedOrder),
    };
    const orderItemRepository = {
      create: jest.fn().mockImplementation((value: OrderItem) => value),
      save: jest.fn().mockResolvedValue([]),
    };
    const orderAddressRepository = {
      create: jest.fn().mockImplementation((value: OrderAddress) => value),
      save: jest.fn().mockResolvedValue({}),
    };
    const repositories = new Map<unknown, unknown>([
      [UserAddress, { findOne: jest.fn().mockResolvedValue(address) }],
      [Cart, { findOne: jest.fn().mockResolvedValue(cart) }],
      [CartItem, cartItemRepository],
      [Product, { find: jest.fn().mockResolvedValue(products) }],
      [Inventory, inventoryRepository],
      [ProductImage, { find: jest.fn().mockResolvedValue([]) }],
      [Order, orderRepository],
      [OrderItem, orderItemRepository],
      [OrderAddress, orderAddressRepository],
    ]);
    const manager = {
      getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
    } as unknown as EntityManager;
    const detailedOrder = {
      ...savedOrder,
      user: { email: 'customer@example.com', fullName: 'Customer' },
      items: [],
      deliveryAddress: null,
      couponCode: null,
      couponId: null,
      couponName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Order;
    const injectedOrderRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(detailedOrder),
    } as unknown as Repository<Order>;
    const dataSource = {
      transaction: jest.fn(
        (callback: (entityManager: EntityManager) => Promise<unknown>) =>
          callback(manager),
      ),
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(detailedOrder),
      }),
    } as unknown as DataSource;
    const deliveryService = {
      validateDeliverySelection: jest.fn().mockResolvedValue({
        deliveryFee: 500,
        timeSlot: { id: '3', displayName: 'Morning' },
      }),
      reserveCapacity: jest.fn().mockResolvedValue({}),
    } as unknown as DeliveryAvailabilityService;
    const service = new OrdersService(
      injectedOrderRepository,
      deliveryService,
      {} as CouponsService,
      { createWithManager: jest.fn() } as unknown as NotificationsService,
      { sendOrderCreatedEmail: jest.fn() } as unknown as EmailsService,
      {} as OrderCancellationService,
      dataSource,
    );

    await service.create(
      '7',
      {
        addressId: '4',
        deliveryDate: '2099-08-15',
        timeSlotId: '3',
      },
      'checkout-attempt-1',
    );

    expect(inventoryLockOrder).toEqual(['2', '10']);
    expect(deletedCartItems?.cartId).toBe('6');
    expect(deletedCartItems?.id.value).toEqual(['101', '102']);
  });

  it('returns an existing order for a network retry with the same key', async () => {
    const existingOrder = {
      id: '50',
      userId: '7',
      idempotencyKey: 'checkout-attempt-1',
      idempotencyFingerprint:
        'a3d5a4b5734c67a5bf038af173abd34c8d71e71c0bd86fb775b406a2b547b5de',
      items: [],
      deliveryAddress: null,
      couponCode: null,
      subtotal: '0',
      deliveryFee: '0',
      discountAmount: '0',
      totalAmount: '0',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Order;
    const ordersRepository = {
      findOne: jest.fn().mockResolvedValue(existingOrder),
    } as unknown as Repository<Order>;
    const dataSource = {
      transaction: jest.fn(),
    } as unknown as DataSource;
    const service = new OrdersService(
      ordersRepository,
      {} as DeliveryAvailabilityService,
      {} as CouponsService,
      {} as NotificationsService,
      {} as EmailsService,
      {} as OrderCancellationService,
      dataSource,
    );

    await service.create(
      '7',
      {
        addressId: '4',
        deliveryDate: '2099-08-15',
        timeSlotId: '3',
      },
      'checkout-attempt-1',
    );

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rechecks idempotency after the cart lock for a simultaneous retry', async () => {
    const existingOrder = {
      id: '50',
      userId: '7',
      idempotencyKey: 'checkout-attempt-1',
      idempotencyFingerprint:
        'a3d5a4b5734c67a5bf038af173abd34c8d71e71c0bd86fb775b406a2b547b5de',
      items: [],
      deliveryAddress: null,
      couponCode: null,
      subtotal: '0',
      deliveryFee: '0',
      discountAmount: '0',
      totalAmount: '0',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Order;
    const cartItemQuery = jest.fn();
    const repositories = new Map<unknown, unknown>([
      [
        Cart,
        { findOne: jest.fn().mockResolvedValue({ id: '6', userId: '7' }) },
      ],
      [Order, { findOne: jest.fn().mockResolvedValue(existingOrder) }],
      [CartItem, { createQueryBuilder: cartItemQuery }],
    ]);
    const manager = {
      getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
    } as unknown as EntityManager;
    const ordersRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(existingOrder),
    } as unknown as Repository<Order>;
    const dataSource = {
      transaction: jest.fn(
        (callback: (entityManager: EntityManager) => Promise<unknown>) =>
          callback(manager),
      ),
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(existingOrder),
      }),
    } as unknown as DataSource;
    const service = new OrdersService(
      ordersRepository,
      {} as DeliveryAvailabilityService,
      {} as CouponsService,
      {} as NotificationsService,
      {} as EmailsService,
      {} as OrderCancellationService,
      dataSource,
    );

    const result = await service.create(
      '7',
      {
        addressId: '4',
        deliveryDate: '2099-08-15',
        timeSlotId: '3',
      },
      'checkout-attempt-1',
    );

    expect(result.id).toBe('50');
    expect(cartItemQuery).not.toHaveBeenCalled();
  });
});
