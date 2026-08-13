import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import {
  DataSource,
  EntityManager,
  In,
  QueryFailedError,
  Repository,
} from 'typeorm';

import { UserAddress } from '../addresses/entities/user-address.entity';
import { Cart } from '../carts/entities/cart.entity';
import { CartItem } from '../carts/entities/cart-item.entity';
import type { CartData, CartDataItem } from '../carts/carts.service';
import { DEFAULT_CURRENCY } from '../common/constants/currency.constant';
import { Inventory } from '../inventories/entities/inventory.entity';
import { ProductImage } from '../product-images/entities/product-image.entity';
import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../products/enums/product-status.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderAddress } from './entities/order-address.entity';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { DeliveryAvailabilityService } from '../deliveries/delivery-availability.service';
import { CouponsService } from '../coupons/coupons.service';
import { Coupon } from '../coupons/entities/coupon.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { EmailsService } from '../emails/emails.service';
import { OrderCancellationService } from './order-cancellation.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    private readonly deliveryAvailabilityService: DeliveryAvailabilityService,
    private readonly couponsService: CouponsService,
    private readonly notificationsService: NotificationsService,
    private readonly emailsService: EmailsService,
    private readonly orderCancellationService: OrderCancellationService,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tạo đơn hàng từ giỏ hàng hiện tại của người dùng.
   */
  async create(
    userId: string,
    dto: CreateOrderDto,
    rawIdempotencyKey?: string,
  ) {
    this.validateDeliveryDate(dto.deliveryDate);

    const idempotencyKey = this.normalizeIdempotencyKey(rawIdempotencyKey);
    const idempotencyFingerprint = idempotencyKey
      ? this.createIdempotencyFingerprint(dto)
      : null;

    if (idempotencyKey && idempotencyFingerprint) {
      const existingOrder = await this.ordersRepository.findOne({
        where: { userId, idempotencyKey },
      });

      if (existingOrder) {
        this.validateIdempotencyFingerprint(
          existingOrder,
          idempotencyFingerprint,
        );

        return this.findOne(userId, existingOrder.id);
      }
    }

    let creationResult: { orderId: string; created: boolean };

    try {
      creationResult = await this.dataSource.transaction(async (manager) => {
        const orderRepository = manager.getRepository(Order);
        const orderItemRepository = manager.getRepository(OrderItem);
        const orderAddressRepository = manager.getRepository(OrderAddress);
        const inventoryRepository = manager.getRepository(Inventory);
        const cartItemRepository = manager.getRepository(CartItem);

        const cart = await this.lockCart(manager, userId);

        if (idempotencyKey && idempotencyFingerprint) {
          const existingOrder = await orderRepository.findOne({
            where: { userId, idempotencyKey },
            lock: { mode: 'pessimistic_write' },
          });

          if (existingOrder) {
            this.validateIdempotencyFingerprint(
              existingOrder,
              idempotencyFingerprint,
            );

            return { orderId: existingOrder.id, created: false };
          }
        }

        const { address, cartData } = await this.loadCheckoutData(
          manager,
          userId,
          dto.addressId,
          cart,
        );

        this.validateCheckoutCart(cartData);

        const subtotal = cartData.subtotal;

        /*
         * Lưu các Inventory đã khóa.
         *
         * Sau khi kiểm tra tồn kho, chính những entity này
         * sẽ được sử dụng để trừ tồn kho.
         */
        const lockedInventories = new Map<string, Inventory>();

        /*
         * Khóa inventory theo từng sản phẩm để ngăn hai request
         * đồng thời cùng mua số lượng tồn kho cuối cùng.
         */
        const inventoryLockOrder = [...cartData.items].sort((left, right) => {
          const leftId = BigInt(left.product.id);
          const rightId = BigInt(right.product.id);

          return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
        });

        for (const item of inventoryLockOrder) {
          const inventory = await inventoryRepository.findOne({
            where: {
              productId: item.product.id,
            },
            lock: {
              mode: 'pessimistic_write',
            },
          });

          if (!inventory) {
            throw new ConflictException(
              `Sản phẩm ${item.product.name} chưa có thông tin tồn kho`,
            );
          }

          if (inventory.isStockManaged) {
            const availableQuantity =
              inventory.stockQuantity - inventory.reservedQuantity;

            if (item.cartItem.quantity > availableQuantity) {
              throw new ConflictException(
                `Sản phẩm ${item.product.name} không đủ tồn kho`,
              );
            }
          }

          lockedInventories.set(item.product.id, inventory);
        }

        const deliverySelection =
          await this.deliveryAvailabilityService.validateDeliverySelection(
            manager,
            address.prefecture,
            address.city,
            dto.deliveryDate,
            dto.timeSlotId,
          );

        let appliedCoupon: Coupon | null = null;
        let discountAmount = 0;

        if (dto.couponCode?.trim()) {
          const couponResult = await this.couponsService.applyCouponForOrder(
            manager,
            userId,
            dto.couponCode,
            subtotal,
          );

          appliedCoupon = couponResult.coupon;
          discountAmount = couponResult.discountAmount;
        }

        const deliveryFee = deliverySelection.deliveryFee;

        const totalAmount = Math.max(
          subtotal + deliveryFee - discountAmount,
          0,
        );

        await this.deliveryAvailabilityService.reserveCapacity(
          manager,
          dto.deliveryDate,
          dto.timeSlotId,
        );

        /*
         * Tạo Order.
         */
        const order = orderRepository.create({
          orderNumber: this.generateOrderNumber(),

          userId,

          status: OrderStatus.PENDING,

          paymentStatus: PaymentStatus.UNPAID,

          subtotal: subtotal.toFixed(2),

          deliveryFee: deliveryFee.toFixed(2),

          discountAmount: discountAmount.toFixed(2),

          totalAmount: totalAmount.toFixed(2),

          currencyCode: DEFAULT_CURRENCY.code,

          couponId: appliedCoupon?.id ?? null,

          couponCode: appliedCoupon?.code ?? null,

          couponName: appliedCoupon?.name ?? null,

          deliveryDate: dto.deliveryDate,

          deliveryTimeSlotId: deliverySelection.timeSlot.id,

          deliveryTimeSlot: deliverySelection.timeSlot.displayName,

          note: dto.note?.trim() || null,

          idempotencyKey,

          idempotencyFingerprint,
        });

        const savedOrder = await orderRepository.save(order);

        if (appliedCoupon) {
          await this.couponsService.recordCouponUsage(manager, {
            coupon: appliedCoupon,
            userId,
            orderId: savedOrder.id,
            discountAmount,
          });
        }

        /*
         * Tạo snapshot của các sản phẩm trong đơn hàng.
         */
        const orderItems = cartData.items.map((item) => {
          return orderItemRepository.create({
            orderId: savedOrder.id,

            productId: item.product.id,

            productCode: item.product.productCode,

            productName: item.product.name,

            thumbnailUrl: item.primaryImage?.thumbnailUrl ?? null,

            unitPrice: item.currentUnitPrice.toFixed(2),

            quantity: item.cartItem.quantity,

            subtotal: item.subtotal.toFixed(2),
          });
        });

        await orderItemRepository.save(orderItems);

        /*
         * Tạo snapshot địa chỉ giao hàng.
         *
         * Sau khi đặt hàng, việc user sửa hoặc xóa địa chỉ
         * sẽ không làm thay đổi địa chỉ của Order cũ.
         */
        const orderAddress = orderAddressRepository.create({
          orderId: savedOrder.id,

          recipientName: address.recipientName,

          recipientPhone: address.recipientPhone,

          postalCode: address.postalCode,

          prefecture: address.prefecture,

          city: address.city,

          addressLine1: address.addressLine1,

          addressLine2: address.addressLine2 ?? null,
        });

        await orderAddressRepository.save(orderAddress);

        /*
         * Trừ tồn kho bằng chính các Inventory đã được khóa.
         */
        for (const item of cartData.items) {
          const inventory = lockedInventories.get(item.product.id);

          if (!inventory || !inventory.isStockManaged) {
            continue;
          }

          inventory.stockQuantity -= item.cartItem.quantity;

          await inventoryRepository.save(inventory);
        }

        /*
         * Xóa sản phẩm khỏi giỏ hàng sau khi tạo Order thành công.
         *
         * Vì thao tác nằm trong transaction nên nếu có lỗi,
         * việc xóa này cũng sẽ rollback.
         */
        await cartItemRepository.delete({
          cartId: cartData.cart.id,
          id: In(cartData.items.map((item) => item.cartItem.id)),
        });

        await this.notificationsService.createWithManager(manager, {
          userId,
          type: NotificationType.ORDER_CREATED,
          title: 'Đặt hàng thành công',
          message:
            `Đơn hàng ${savedOrder.orderNumber} ` + 'đã được tạo thành công.',
          referenceType: 'ORDER',
          referenceId: savedOrder.id,
        });

        return { orderId: savedOrder.id, created: true };
      });
    } catch (error) {
      if (
        !idempotencyKey ||
        !idempotencyFingerprint ||
        !this.isDuplicateEntry(error)
      ) {
        throw error;
      }

      const existingOrder = await this.ordersRepository.findOne({
        where: { userId, idempotencyKey },
      });

      if (!existingOrder) {
        throw error;
      }

      this.validateIdempotencyFingerprint(
        existingOrder,
        idempotencyFingerprint,
      );
      creationResult = { orderId: existingOrder.id, created: false };
    }

    const orderId = creationResult.orderId;

    const order = await this.dataSource.getRepository(Order).findOne({
      where: {
        id: orderId,
        userId,
      },
      relations: {
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không thể lấy đơn hàng sau khi tạo');
    }

    if (creationResult.created) {
      await this.emailsService.sendOrderCreatedEmail({
        to: order.user.email,
        fullName: order.user.fullName,
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
        currencyCode: order.currencyCode,
        deliveryDate: order.deliveryDate,
      });
    }

    return this.findOne(userId, orderId);
  }

  /**
   * Lấy danh sách đơn hàng của user hiện tại.
   */
  async findAll(userId: string) {
    const orders = await this.ordersRepository.find({
      where: {
        userId,
      },
      relations: {
        items: true,
        deliveryAddress: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return orders.map((order) => this.buildOrderResponse(order));
  }

  /**
   * Lấy chi tiết một đơn hàng của user hiện tại.
   */
  async findOne(userId: string, orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId,
      },
      relations: {
        items: {
          product: true,
        },
        deliveryAddress: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return this.buildOrderResponse(order);
  }

  /**
   * Hủy đơn hàng và hoàn lại tồn kho.
   */
  async cancel(userId: string, orderId: string, reason?: string) {
    const cancelledOrderId = await this.dataSource.transaction(
      async (manager) => {
        const orderRepository = manager.getRepository(Order);

        const order = await orderRepository.findOne({
          where: {
            id: orderId,
            userId,
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

        await this.orderCancellationService.cancel(manager, {
          order,
          changedByUserId: userId,
          reason,
          allowedStatuses: [OrderStatus.PENDING, OrderStatus.CONFIRMED],
        });

        await this.notificationsService.createWithManager(manager, {
          userId: order.userId,
          type: NotificationType.ORDER_CANCELLED,
          title: 'Đơn hàng đã được hủy',
          message: `Đơn hàng ${order.orderNumber} ` + 'đã được hủy thành công.',
          referenceType: 'ORDER',
          referenceId: order.id,
        });

        return order.id;
      },
    );

    const cancelledOrder = await this.dataSource.getRepository(Order).findOne({
      where: {
        id: cancelledOrderId,
        userId,
      },
      relations: {
        user: true,
      },
    });

    if (!cancelledOrder) {
      throw new NotFoundException('Không thể lấy đơn hàng sau khi hủy');
    }

    await this.emailsService.sendOrderStatusChangedEmail({
      to: cancelledOrder.user.email,
      fullName: cancelledOrder.user.fullName,
      orderId: cancelledOrder.id,
      orderNumber: cancelledOrder.orderNumber,
      statusLabel: 'Đơn hàng đã được hủy',
      message:
        `Đơn hàng ${cancelledOrder.orderNumber} ` + 'đã được hủy thành công.',
    });

    return this.findOne(userId, cancelledOrderId);
  }

  /**
   * Chuyển Order entity thành response trả về frontend.
   */
  private buildOrderResponse(order: Order) {
    return {
      id: order.id,

      orderNumber: order.orderNumber,

      status: order.status,

      paymentStatus: order.paymentStatus,

      currency: {
        ...DEFAULT_CURRENCY,
        code: order.currencyCode,
      },

      items:
        order.items?.map((item) => ({
          id: item.id,

          productId: item.productId,

          productCode: item.productCode,

          productName: item.productName,

          productSlug: item.product?.slug ?? null,

          thumbnailUrl: item.thumbnailUrl,

          unitPrice: Number(item.unitPrice),

          quantity: item.quantity,

          subtotal: Number(item.subtotal),
        })) ?? [],

      deliveryAddress: order.deliveryAddress
        ? {
            recipientName: order.deliveryAddress.recipientName,

            recipientPhone: order.deliveryAddress.recipientPhone,

            postalCode: order.deliveryAddress.postalCode,

            prefecture: order.deliveryAddress.prefecture,

            city: order.deliveryAddress.city,

            addressLine1: order.deliveryAddress.addressLine1,

            addressLine2: order.deliveryAddress.addressLine2,
          }
        : null,

      delivery: {
        date: order.deliveryDate,

        timeSlotId: order.deliveryTimeSlotId,

        timeSlot: order.deliveryTimeSlot,

        fee: Number(order.deliveryFee),
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

      note: order.note,

      createdAt: order.createdAt,

      updatedAt: order.updatedAt,
    };
  }

  /**
   * Kiểm tra ngày giao hàng.
   */
  private validateDeliveryDate(deliveryDate: string): void {
    const selectedDate = new Date(`${deliveryDate}T00:00:00`);

    if (Number.isNaN(selectedDate.getTime())) {
      throw new BadRequestException('Ngày giao hàng không hợp lệ');
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      throw new BadRequestException(
        'Ngày giao hàng không được nằm trong quá khứ',
      );
    }
  }

  /**
   * Tạo mã Order không phụ thuộc ID trong database.
   *
   * Ví dụ:
   * ORD-20260729-4A87C8E4A92D
   */
  private generateOrderNumber(): string {
    const now = new Date();

    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');

    const uniquePart = randomUUID()
      .replace(/-/g, '')
      .slice(0, 12)
      .toUpperCase();

    return `ORD-${datePart}-${uniquePart}`;
  }

  private async lockCart(
    manager: EntityManager,
    userId: string,
  ): Promise<Cart> {
    const cart = await manager.getRepository(Cart).findOne({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!cart) {
      throw new BadRequestException('Giỏ hàng đang trống');
    }

    return cart;
  }

  private async loadCheckoutData(
    manager: EntityManager,
    userId: string,
    addressId: string,
    cart: Cart,
  ): Promise<{ address: UserAddress; cartData: CartData }> {
    const address = await manager.getRepository(UserAddress).findOne({
      where: { id: addressId, userId },
      lock: { mode: 'pessimistic_read' },
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    const cartItems = await manager
      .getRepository(CartItem)
      .createQueryBuilder('cartItem')
      .where('cartItem.cartId = :cartId', { cartId: cart.id })
      .orderBy('cartItem.createdAt', 'ASC')
      .setLock('pessimistic_write')
      .getMany();

    if (cartItems.length === 0) {
      return {
        address,
        cartData: { cart, items: [], totalQuantity: 0, subtotal: 0 },
      };
    }

    const productIds = [...new Set(cartItems.map((item) => item.productId))];
    const [products, inventories, primaryImages] = await Promise.all([
      manager.getRepository(Product).find({
        where: { id: In(productIds) },
        withDeleted: true,
      }),
      manager.getRepository(Inventory).find({
        where: { productId: In(productIds) },
      }),
      manager.getRepository(ProductImage).find({
        where: {
          productId: In(productIds),
          isPrimary: true,
        },
      }),
    ]);

    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );
    const inventoryMap = new Map(
      inventories.map((inventory) => [inventory.productId, inventory]),
    );
    const imageMap = new Map(
      primaryImages.map((image) => [image.productId, image]),
    );

    let totalQuantity = 0;
    let subtotal = 0;

    const items: CartDataItem[] = cartItems.map((cartItem) => {
      const product = productMap.get(cartItem.productId);

      if (!product) {
        throw new ConflictException(
          `Sản phẩm ${cartItem.productId} không còn tồn tại`,
        );
      }

      const inventory = inventoryMap.get(product.id) ?? null;
      const currentUnitPrice = this.getProductPrice(product);
      const storedUnitPrice = Number(cartItem.unitPrice);
      const availableQuantity = inventory
        ? inventory.isStockManaged
          ? Math.max(inventory.stockQuantity - inventory.reservedQuantity, 0)
          : Number.MAX_SAFE_INTEGER
        : 0;
      const itemSubtotal = currentUnitPrice * cartItem.quantity;
      const isProductActive =
        product.deletedAt === null && product.status === ProductStatus.ACTIVE;
      const hasEnoughStock =
        inventory !== null && cartItem.quantity <= availableQuantity;

      totalQuantity += cartItem.quantity;
      subtotal += itemSubtotal;

      return {
        cartItem,
        product,
        inventory,
        primaryImage: imageMap.get(product.id) ?? null,
        currentUnitPrice,
        storedUnitPrice,
        availableQuantity,
        subtotal: itemSubtotal,
        priceChanged: storedUnitPrice !== currentUnitPrice,
        isAvailable: isProductActive && hasEnoughStock,
      };
    });

    return {
      address,
      cartData: { cart, items, totalQuantity, subtotal },
    };
  }

  private validateCheckoutCart(cartData: CartData): void {
    if (cartData.items.length === 0) {
      throw new BadRequestException('Giỏ hàng đang trống');
    }

    if (cartData.items.some((item) => !item.isAvailable)) {
      throw new ConflictException(
        'Có sản phẩm không còn khả dụng hoặc không đủ tồn kho',
      );
    }

    if (cartData.items.some((item) => item.priceChanged)) {
      throw new ConflictException(
        'Giá sản phẩm đã thay đổi. Vui lòng kiểm tra lại giỏ hàng',
      );
    }
  }

  private getProductPrice(product: Product): number {
    return product.salePrice !== null
      ? Number(product.salePrice)
      : Number(product.basePrice);
  }

  private normalizeIdempotencyKey(rawKey?: string): string | null {
    const key = rawKey?.trim();

    if (!key) {
      return null;
    }

    if (key.length < 8 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
      throw new BadRequestException('Idempotency-Key không hợp lệ');
    }

    return key;
  }

  private createIdempotencyFingerprint(dto: CreateOrderDto): string {
    const normalizedPayload = JSON.stringify({
      addressId: dto.addressId,
      deliveryDate: dto.deliveryDate,
      timeSlotId: dto.timeSlotId,
      couponCode: dto.couponCode?.trim().toUpperCase() || null,
      note: dto.note?.trim() || null,
    });

    return createHash('sha256').update(normalizedPayload).digest('hex');
  }

  private validateIdempotencyFingerprint(
    order: Order,
    fingerprint: string,
  ): void {
    if (order.idempotencyFingerprint !== fingerprint) {
      throw new ConflictException(
        'Idempotency-Key đã được sử dụng cho một yêu cầu khác',
      );
    }
  }

  private isDuplicateEntry(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError: unknown = error.driverError;

    return (
      typeof driverError === 'object' &&
      driverError !== null &&
      'code' in driverError &&
      driverError.code === 'ER_DUP_ENTRY'
    );
  }
}
